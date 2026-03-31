from collections import Counter
from datetime import datetime, timezone
import json
import os
import socket
from time import perf_counter
import uuid

from flask import Flask, render_template, request, jsonify, send_from_directory, send_file, abort
import joblib
import librosa
import numpy as np
from pydub import AudioSegment

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
TEMP_DIR = os.path.join(BASE_DIR, "temp")
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
SPA_DIR = os.path.join(BASE_DIR, "frontend", "dist")

os.makedirs(TEMP_DIR, exist_ok=True)

# =========================
# Load models
# =========================

asphyxia_model = joblib.load(os.path.join(MODELS_DIR, "asphyxia_rf_model.pkl"))
asphyxia_scaler = joblib.load(os.path.join(MODELS_DIR, "asphyxia_scaler.pkl"))
ASPHYXIA_MODEL_THRESHOLD = float(joblib.load(os.path.join(MODELS_DIR, "asphyxia_threshold.pkl")))
ASPHYXIA_CLASSES = [int(round(float(label))) for label in getattr(asphyxia_model, "classes_", [])]
if 1 not in ASPHYXIA_CLASSES:
    raise RuntimeError(f"Expected asphyxia positive class label 1, got {ASPHYXIA_CLASSES}")
ASPHYXIA_CLASS_INDEX = ASPHYXIA_CLASSES.index(1)

csi_min = float(joblib.load(os.path.join(MODELS_DIR, "csi_min.pkl")))
csi_max = float(joblib.load(os.path.join(MODELS_DIR, "csi_max.pkl")))

with open(os.path.join(MODELS_DIR, "preprocess_config.json")) as f:
    config = json.load(f)

SR = config.get("sample_rate", 16000)
DURATION = config.get("duration", 3.0)
N_MFCC = config.get("n_mfcc", 20)
MAX_LEN = int(SR * DURATION)

MAX_AUDIO_SECONDS = 10.0
FRAME_SECONDS = 2.0
FRAME_HOP_SECONDS = 2.0
FRAME_LEN = max(1, int(SR * FRAME_SECONDS))
FRAME_HOP = max(1, int(SR * FRAME_HOP_SECONDS))
MAX_SEGMENTS = 4
MIN_ANALYSIS_SECONDS = 0.75

RMS_SILENCE_THRESHOLD = 0.0035
RMS_FRAME_THRESHOLD = 0.0045
PEAK_MIN_THRESHOLD = 0.03
MIN_BABY_VOTE_RATIO = 0.2
STRICT_BABY_VOTE_RATIO = 0.5
BABY_GATE_THRESHOLD = 0.48
STRICT_BABY_GATE_THRESHOLD = 0.45
ADULT_VOICE_REJECTION_RATIO = 0.4
BACKGROUND_REJECTION_RATIO = 0.4
UNCERTAIN_RATIO_THRESHOLD = 0.45
LOW_CONFIDENCE_FLOOR = 0.4
ACCEPT_CONFIDENCE_THRESHOLD = 0.6
ASPHYXIA_PRIORITY_THRESHOLD = 0.4
TOP_PREDICTION_WEIGHT = 1.0
VOTE_RATIO_WEIGHT = 0.0


# =========================
# IMAGE ROUTE
# =========================

@app.route("/image/<name>")
def get_image(name):
    return send_from_directory(ASSETS_DIR, name)


# =========================
# Audio Helpers
# =========================

def load_audio(path):
    audio, _ = librosa.load(path, sr=SR, mono=True)
    return audio


def normalize_audio(audio):
    audio = np.nan_to_num(audio.astype(np.float32), nan=0.0, posinf=0.0, neginf=0.0)
    if not len(audio):
        return audio

    peak = float(np.max(np.abs(audio)))
    if peak > 0:
        audio = audio / peak

    return np.clip(audio, -1.0, 1.0)


def limit_audio_duration(audio, max_seconds=MAX_AUDIO_SECONDS):
    max_samples = int(SR * max_seconds)
    if len(audio) <= max_samples:
        return audio

    step = max(1, SR)
    best_start = 0
    best_energy = -1.0
    for start in range(0, len(audio) - max_samples + 1, step):
        window = audio[start:start + max_samples]
        energy = float(np.mean(np.abs(window)))
        if energy > best_energy:
            best_energy = energy
            best_start = start

    return audio[best_start:best_start + max_samples]


def reduce_noise(audio):
    if len(audio) < 512:
        return normalize_audio(audio)

    stft = librosa.stft(audio, n_fft=512, hop_length=128)
    magnitude = np.abs(stft)
    phase = np.exp(1j * np.angle(stft))

    frame_energy = magnitude.mean(axis=0)
    noise_frames = max(1, int(magnitude.shape[1] * 0.15))
    noise_idx = np.argsort(frame_energy)[:noise_frames]
    noise_profile = np.median(magnitude[:, noise_idx], axis=1, keepdims=True)

    cleaned_mag = np.maximum(magnitude - (noise_profile * 1.1), 0.0)
    cleaned = librosa.istft(cleaned_mag * phase, hop_length=128, length=len(audio))
    cleaned = librosa.effects.preemphasis(cleaned)
    return normalize_audio(cleaned)


def preprocess_audio(audio):
    if audio is None or not len(audio):
        return np.array([], dtype=np.float32)

    audio = normalize_audio(audio)
    trimmed, _ = librosa.effects.trim(audio, top_db=25)
    if len(trimmed) >= int(SR * MIN_ANALYSIS_SECONDS):
        audio = trimmed

    audio = limit_audio_duration(audio)
    return audio


def extract_model_features(audio):
    if len(audio) < MAX_LEN:
        audio = np.pad(audio, (0, MAX_LEN - len(audio)))
    else:
        audio = audio[:MAX_LEN]

    mfcc = librosa.feature.mfcc(y=audio, sr=SR, n_mfcc=N_MFCC)

    return np.hstack([
        mfcc.mean(axis=1),
        mfcc.std(axis=1),
        librosa.feature.rms(y=audio).mean(),
        librosa.feature.zero_crossing_rate(audio).mean(),
        librosa.feature.spectral_centroid(y=audio, sr=SR).mean(),
        librosa.feature.spectral_bandwidth(y=audio, sr=SR).mean(),
    ])


def extract_signal_profile(audio):
    audio = normalize_audio(audio)
    mel = librosa.feature.melspectrogram(y=audio, sr=SR, n_mels=40, fmax=8000)
    mel_db = librosa.power_to_db(mel + 1e-9, ref=np.max)

    pitches = estimate_pitch_track(audio)

    voiced = pitches[(pitches >= 120) & (pitches <= 900)] if len(pitches) else np.array([])

    return {
        "rms": float(np.mean(librosa.feature.rms(y=audio))),
        "peak": float(np.max(np.abs(audio))) if len(audio) else 0.0,
        "zcr": float(np.mean(librosa.feature.zero_crossing_rate(audio))),
        "centroid": float(np.mean(librosa.feature.spectral_centroid(y=audio, sr=SR))),
        "bandwidth": float(np.mean(librosa.feature.spectral_bandwidth(y=audio, sr=SR))),
        "flatness": float(np.mean(librosa.feature.spectral_flatness(y=audio))),
        "rolloff": float(np.mean(librosa.feature.spectral_rolloff(y=audio, sr=SR))),
        "mel_mean": float(np.mean(mel_db)),
        "mel_std": float(np.std(mel_db)),
        "pitch_mean": float(np.mean(voiced)) if len(voiced) else 0.0,
        "pitch_std": float(np.std(voiced)) if len(voiced) else 0.0,
        "voiced_ratio": float(len(voiced) / max(1, len(pitches))) if len(pitches) else 0.0,
    }


def compute_csi(features):
    mfcc_std = np.mean(features[N_MFCC:2 * N_MFCC])
    rms = features[2 * N_MFCC]
    centroid = features[2 * N_MFCC + 2]
    bandwidth = features[2 * N_MFCC + 3]

    csi = (
        0.4 * rms +
        0.2 * mfcc_std +
        0.2 * bandwidth +
        0.2 * centroid
    )

    return float(csi)


def softmax(scores, temperature=1.0):
    values = np.array(list(scores.values()), dtype=np.float32)
    temperature = max(float(temperature), 1e-3)
    values = values / temperature
    shifted = values - np.max(values)
    exps = np.exp(shifted)
    total = float(np.sum(exps))
    if total <= 0:
        return {key: 0.0 for key in scores}
    return {key: float(value / total) for key, value in zip(scores.keys(), exps)}


def estimate_pitch_track(audio):
    try:
        pitches = librosa.yin(audio, fmin=120, fmax=900, sr=SR)
        pitches = pitches[np.isfinite(pitches)]
        return pitches[pitches > 0]
    except Exception:
        return np.array([])


def extract_pitch(pitches):
    if len(pitches) == 0:
        return 0.0, 0.0

    return float(np.mean(pitches)), float(pitches[-1] - pitches[0])


def prepare_segment_context(audio):
    normalized_audio = normalize_audio(audio)
    mel = librosa.feature.melspectrogram(y=normalized_audio, sr=SR, n_mels=64, fmax=8000)
    mel_db = librosa.power_to_db(mel + 1e-9, ref=np.max)
    pitch_track = estimate_pitch_track(normalized_audio)
    pitch_mean, pitch_slope = extract_pitch(pitch_track)

    return {
        "audio": normalized_audio,
        "profile": extract_signal_profile(normalized_audio),
        "pitch_mean": pitch_mean,
        "pitch_slope": pitch_slope,
        "mel_db": mel_db,
    }


def detect_sound_type(segment_context):
    try:
        profile = dict(segment_context["profile"])
        pitch_mean = segment_context["pitch_mean"]
        pitch_slope = segment_context["pitch_slope"]
        if pitch_mean > 0:
            profile["pitch_mean"] = pitch_mean
        profile["pitch_slope"] = pitch_slope

        if profile["rms"] < RMS_FRAME_THRESHOLD or profile["peak"] < PEAK_MIN_THRESHOLD:
            return {"label": "no_significant_sound", "confidence": 1.0, "profile": profile}

        baby_score = 0.0
        voice_score = 0.0
        noise_score = 0.0

        if 280 <= profile["pitch_mean"] <= 760:
            baby_score += 0.24
        elif 90 <= profile["pitch_mean"] <= 240:
            voice_score += 0.38
        else:
            noise_score += 0.14

        if profile["pitch_std"] >= 38:
            baby_score += 0.18
        elif profile["pitch_std"] <= 24 and profile["voiced_ratio"] >= 0.55:
            voice_score += 0.16
        elif profile["voiced_ratio"] > 0.65:
            voice_score += 0.12

        if 1000 <= profile["centroid"] <= 3600:
            baby_score += 0.15
        elif profile["centroid"] < 1200:
            voice_score += 0.18
        elif profile["centroid"] > 4200:
            noise_score += 0.2

        if 0.05 <= profile["zcr"] <= 0.2:
            baby_score += 0.1
        elif profile["zcr"] < 0.05:
            voice_score += 0.12
        else:
            noise_score += 0.18

        if profile["flatness"] < 0.18 and profile["voiced_ratio"] >= 0.55:
            voice_score += 0.12
        elif profile["flatness"] < 0.22:
            baby_score += 0.08
            voice_score += 0.08
        elif profile["flatness"] > 0.35:
            noise_score += 0.25

        if profile["mel_std"] > 11:
            baby_score += 0.14
        elif profile["mel_std"] < 8.5:
            voice_score += 0.12

        if abs(profile["pitch_slope"]) > 20:
            baby_score += 0.13
        elif abs(profile["pitch_slope"]) < 8:
            voice_score += 0.08

        if profile["voiced_ratio"] < 0.18:
            noise_score += 0.16
        elif 0.22 <= profile["voiced_ratio"] <= 0.76:
            baby_score += 0.08
        elif profile["voiced_ratio"] > 0.82:
            voice_score += 0.12

        if profile["rolloff"] > 5200:
            noise_score += 0.18

        scores = {
            "baby_cry": baby_score,
            "adult_voice": voice_score,
            "background_noise": noise_score,
        }
        label, score = max(scores.items(), key=lambda item: item[1])
        score = float(min(1.0, max(0.0, score)))

        if score < 0.5:
            label = "uncertain"

        return {"label": label, "confidence": round(score, 3), "profile": profile}
    except Exception:
        return {"label": "uncertain", "confidence": 0.0, "profile": {}}


def classify_normal_cause(segment_context):
    try:
        profile = segment_context["profile"]
        pitch_mean = segment_context["pitch_mean"]
        pitch_slope = segment_context["pitch_slope"]
        mel_db = segment_context["mel_db"]

        energy = profile["rms"]
        centroid = profile["centroid"]
        zcr = profile["zcr"]
        flatness = profile["flatness"]
        voiced_ratio = profile["voiced_ratio"]
        mel_std = float(np.std(mel_db))
        mel_mean = float(np.mean(mel_db))
        pitch_var = profile["pitch_std"]

        scores = {
            "general": 0.2,
            "hungry": 0.0,
            "sleepy": 0.0,
            "tired": 0.0,
            "lonely": 0.0,
            "discomfort": 0.0,
            "belly": 0.0,
        }

        if pitch_mean >= 330:
            scores["hungry"] += 1.4
        if abs(pitch_slope) >= 16:
            scores["hungry"] += 0.8
        if mel_std >= 12:
            scores["hungry"] += 0.5

        if energy <= 0.04:
            scores["sleepy"] += 1.3
        if pitch_mean and pitch_mean <= 320:
            scores["sleepy"] += 0.6
        if voiced_ratio >= 0.5:
            scores["sleepy"] += 0.4

        if 0.045 <= energy <= 0.075:
            scores["tired"] += 1.1
        if 250 <= pitch_mean <= 390:
            scores["tired"] += 0.7
        if mel_mean <= -22:
            scores["tired"] += 0.4

        if energy <= 0.035:
            scores["lonely"] += 1.1
        if zcr <= 0.08:
            scores["lonely"] += 0.6
        if pitch_var <= 45:
            scores["lonely"] += 0.45

        if centroid >= 2800:
            scores["discomfort"] += 1.2
        if zcr >= 0.1:
            scores["discomfort"] += 0.8
        if flatness >= 0.2:
            scores["discomfort"] += 0.45

        if energy >= 0.06:
            scores["belly"] += 0.85
        if pitch_mean >= 380:
            scores["belly"] += 1.1
        if pitch_var >= 60:
            scores["belly"] += 0.6
        if centroid >= 2300 and zcr <= 0.11:
            scores["belly"] += 0.35

        if 240 <= pitch_mean <= 430:
            scores["general"] += 0.45
        if 0.04 <= energy <= 0.07:
            scores["general"] += 0.4
        if 8 <= mel_std <= 12:
            scores["general"] += 0.35

        probabilities = softmax(scores, temperature=0.72)
        label, confidence = max(probabilities.items(), key=lambda item: item[1])
        return {"label": label, "confidence": round(float(confidence), 3), "scores": probabilities}
    except Exception:
        return {"label": "general", "confidence": 0.0, "scores": {"general": 1.0}}


def log_debug_summary(tag, payload):
    try:
        print(f"[DEBUG] {tag}: {json.dumps(payload, sort_keys=True)}")
    except Exception:
        print(f"[DEBUG] {tag}: {payload}")


def slice_audio(audio):
    if len(audio) <= FRAME_LEN:
        return [audio]

    segments = []
    upper_bound = max(0, len(audio) - FRAME_LEN)
    starts = range(0, upper_bound + 1, FRAME_HOP)
    if len(audio) > FRAME_LEN * MAX_SEGMENTS:
        starts = np.linspace(0, upper_bound, num=MAX_SEGMENTS, dtype=int)

    seen = set()
    for start in starts:
        start = int(start)
        if start in seen:
            continue
        seen.add(start)
        segment = audio[start:start + FRAME_LEN]
        if len(segment) < int(SR * MIN_ANALYSIS_SECONDS):
            continue
        segments.append(segment)
        if len(segments) >= MAX_SEGMENTS:
            break

    if not segments:
        segments.append(audio[:FRAME_LEN])

    return segments


def predict_asphyxia_probability(audio):
    features = extract_model_features(audio).reshape(1, -1)
    features_scaled = asphyxia_scaler.transform(features)
    probs = asphyxia_model.predict_proba(features_scaled)[0]
    print("DEBUG Asphyxia probs:", probs)
    return float(probs[ASPHYXIA_CLASS_INDEX])


def build_top_predictions(score_map):
    sorted_predictions = sorted(score_map.items(), key=lambda item: item[1], reverse=True)
    return [{"label": label, "score": round(float(score), 3)} for label, score in sorted_predictions[:3]]


def mean_label_confidence(segment_votes, label):
    matches = [item["confidence"] for item in segment_votes if item["label"] == label]
    return float(np.mean(matches)) if matches else 0.0


def classify_audio_type(audio, segment_votes):
    vote_counter = Counter(item["label"] for item in segment_votes)
    total_votes = max(1, len(segment_votes))
    vote_ratios = {label: count / total_votes for label, count in vote_counter.items()}
    clip_context = prepare_segment_context(audio)
    profile = clip_context["profile"]
    pitch_mean = clip_context["pitch_mean"]
    pitch_slope = clip_context["pitch_slope"]

    baby_ratio = vote_ratios.get("baby_cry", 0.0)
    voice_ratio = vote_ratios.get("adult_voice", 0.0)
    noise_ratio = vote_ratios.get("background_noise", 0.0)
    uncertain_ratio = vote_ratios.get("uncertain", 0.0)

    baby_conf = mean_label_confidence(segment_votes, "baby_cry")
    voice_conf = mean_label_confidence(segment_votes, "adult_voice")
    noise_conf = mean_label_confidence(segment_votes, "background_noise")

    baby_profile_match = (
        280 <= pitch_mean <= 780 and
        profile["mel_std"] >= 8.0 and
        (profile["pitch_std"] >= 28 or abs(pitch_slope) >= 12)
    )
    music_like = (
        profile["voiced_ratio"] >= 0.55 and
        profile["pitch_std"] <= 26 and
        profile["mel_std"] <= 8.5 and
        profile["flatness"] <= 0.2 and
        110 <= pitch_mean <= 420
    )

    if (
        baby_ratio >= STRICT_BABY_VOTE_RATIO and
        baby_conf >= STRICT_BABY_GATE_THRESHOLD and
        baby_profile_match and
        voice_ratio < ADULT_VOICE_REJECTION_RATIO and
        not music_like
    ):
        confidence = min(1.0, (baby_conf * 0.7) + (baby_ratio * 0.3))
        return {
            "label": "baby_cry",
            "confidence": round(float(confidence), 3),
            "profile": profile,
            "vote_ratios": vote_ratios,
        }

    if voice_ratio >= ADULT_VOICE_REJECTION_RATIO and voice_conf >= 0.5 and baby_ratio < 0.35:
        confidence = min(1.0, (voice_conf * 0.65) + (voice_ratio * 0.35))
        return {
            "label": "adult_voice",
            "confidence": round(float(confidence), 3),
            "profile": profile,
            "vote_ratios": vote_ratios,
        }

    if ((noise_ratio >= BACKGROUND_REJECTION_RATIO and noise_conf >= 0.48) or music_like) and baby_ratio < 0.4:
        confidence = max(noise_conf, noise_ratio, 0.55 if music_like else 0.0)
        return {
            "label": "background_noise",
            "confidence": round(float(min(1.0, confidence)), 3),
            "profile": profile,
            "vote_ratios": vote_ratios,
        }

    if uncertain_ratio >= UNCERTAIN_RATIO_THRESHOLD or baby_ratio < MIN_BABY_VOTE_RATIO or baby_conf < BABY_GATE_THRESHOLD:
        confidence = max(uncertain_ratio, baby_conf, voice_conf, noise_conf)
        return {
            "label": "uncertain",
            "confidence": round(float(min(1.0, confidence)), 3),
            "profile": profile,
            "vote_ratios": vote_ratios,
        }

    return {
        "label": "uncertain",
        "confidence": round(float(max(baby_conf, voice_conf, noise_conf)), 3),
        "profile": profile,
        "vote_ratios": vote_ratios,
    }


def analyze_audio(audio):
    if not len(audio):
        return {
            "classification": "No significant sound detected",
            "status": "no_sound",
            "cry_type": None,
            "confidence": 0,
            "audio_type": "unclear_audio",
        }

    overall_rms = float(np.mean(librosa.feature.rms(y=audio)))
    overall_peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
    if overall_rms < RMS_SILENCE_THRESHOLD or overall_peak < PEAK_MIN_THRESHOLD:
        return {
            "classification": "No significant sound detected",
            "status": "no_sound",
            "cry_type": None,
            "confidence": 0,
            "audio_type": "unclear_audio",
        }

    segments = slice_audio(audio)
    segment_votes = []
    baby_segments = []

    for segment in segments:
        segment_context = prepare_segment_context(segment)
        result = detect_sound_type(segment_context)
        if result["label"] == "no_significant_sound":
            continue

        segment_votes.append(result)
        if result["label"] == "baby_cry":
            baby_segments.append({
                "context": segment_context,
                "gate": result,
            })

    if not segment_votes:
        return {
            "classification": "No significant sound detected",
            "status": "no_sound",
            "cry_type": None,
            "confidence": 0,
            "audio_type": "unclear_audio",
        }

    audio_gate = classify_audio_type(audio, segment_votes)
    if audio_gate["label"] != "baby_cry" and audio_gate["confidence"] > 0.75:
        log_debug_summary("sound_gate", {
            "overall_rms": round(overall_rms, 4),
            "overall_peak": round(overall_peak, 4),
            "audio_type": audio_gate["label"],
            "confidence": round(audio_gate["confidence"], 3),
            "vote_ratios": {key: round(value, 3) for key, value in audio_gate["vote_ratios"].items()},
        })
        if audio_gate["label"] == "adult_voice":
            return {
                "classification": "Human voice detected",
                "status": "not_baby_cry",
                "cry_type": None,
                "confidence": audio_gate["confidence"],
                "detected_sound": "adult_voice",
                "audio_type": "human_voice",
            }
        if audio_gate["label"] == "background_noise":
            return {
                "classification": "Other sound detected",
                "status": "not_baby_cry",
                "cry_type": None,
                "confidence": audio_gate["confidence"],
                "detected_sound": "background_noise",
                "audio_type": "other_sound",
            }
        return {
            "classification": "Unclear audio - please provide a clearer baby cry",
            "status": "uncertain",
            "cry_type": None,
            "confidence": audio_gate["confidence"],
            "audio_type": "unclear_audio",
        }

    baby_gate_conf = audio_gate["confidence"]
    baby_vote_ratio = audio_gate["vote_ratios"].get("baby_cry", 0.0)

    if len(baby_segments) == 0 or baby_vote_ratio < STRICT_BABY_VOTE_RATIO or baby_gate_conf < STRICT_BABY_GATE_THRESHOLD:
        log_debug_summary("baby_gate_low_conf", {
            "segment_votes": len(segment_votes),
            "baby_segments": len(baby_segments),
            "baby_vote_ratio": round(baby_vote_ratio, 3),
            "baby_gate_conf": round(baby_gate_conf, 3),
        })
        return {
            "classification": "Uncertain result - please provide clearer audio",
            "status": "uncertain",
            "cry_type": None,
            "confidence": round(baby_gate_conf, 3),
            "audio_type": "unclear_audio",
        }

    cause_predictions = []

    for item in baby_segments:
        segment_context = item["context"]
        cause_predictions.append(classify_normal_cause(segment_context))

    asphyxia_confidence = round(predict_asphyxia_probability(audio), 3)

    avg_scores = {}
    if cause_predictions:
        for label in ("general", "hungry", "sleepy", "tired", "lonely", "discomfort", "belly"):
            avg_scores[label] = float(np.mean([
                item["scores"].get(label, 0.0) for item in cause_predictions
            ]))

    overall_score_map = {"asphyxia": asphyxia_confidence, **avg_scores}
    top_predictions = build_top_predictions(overall_score_map)

    if asphyxia_confidence >= ASPHYXIA_PRIORITY_THRESHOLD:
        log_debug_summary("prediction", {
            "asphyxia_confidence": asphyxia_confidence,
            "predicted_class": "asphyxia",
            "confidence": asphyxia_confidence,
            "top_predictions": top_predictions,
            "model_threshold_reference": ASPHYXIA_MODEL_THRESHOLD,
        })
        return {
            "classification": "Detected: Asphyxia - Seek immediate medical help",
            "status": "asphyxia",
            "cry_type": "asphyxia",
            "confidence": asphyxia_confidence,
            "top_predictions": top_predictions,
            "audio_type": "baby_cry",
        }

    cause_counter = Counter(item["label"] for item in cause_predictions)
    majority_cause, majority_count = cause_counter.most_common(1)[0] if cause_counter else ("general", 0)
    cause_vote_ratio = majority_count / len(cause_predictions) if cause_predictions else 0.0
    majority_cause_conf = float(np.mean([
        item["confidence"] for item in cause_predictions if item["label"] == majority_cause
    ])) if cause_predictions else 0.0

    predicted_label, predicted_probability = max(avg_scores.items(), key=lambda item: item[1]) if avg_scores else ("general", 0.0)
    final_confidence = round(float(np.clip(
        (predicted_probability * TOP_PREDICTION_WEIGHT) + (cause_vote_ratio * VOTE_RATIO_WEIGHT),
        0.0,
        1.0,
    )), 3)
    log_debug_summary("prediction", {
        "baby_gate_conf": round(baby_gate_conf, 3),
        "asphyxia_confidence": asphyxia_confidence,
        "final_confidence": final_confidence,
        "predicted_class": predicted_label,
        "majority_cause": majority_cause,
        "majority_cause_conf": round(majority_cause_conf, 3),
        "cause_vote_ratio": round(cause_vote_ratio, 3),
        "top_predictions": top_predictions,
    })

    if final_confidence < LOW_CONFIDENCE_FLOOR:
        return {
            "classification": "Uncertain result - please provide clearer audio",
            "status": "uncertain",
            "cry_type": None,
            "confidence": final_confidence,
            "top_predictions": top_predictions,
            "audio_type": "unclear_audio",
        }

    confidence_band = "high" if final_confidence >= ACCEPT_CONFIDENCE_THRESHOLD else "low"
    response = {
        "classification": "Low confidence prediction" if confidence_band == "low" else "Baby cry detected",
        "status": "baby_cry",
        "confidence_band": confidence_band,
        "cry_type": predicted_label,
        "confidence": final_confidence,
        "possible_cause": predicted_label,
        "cause_confidence": round(float(predicted_probability), 3),
        "top_predictions": top_predictions,
        "audio_type": "baby_cry",
    }

    return response


# =========================
# ROUTES
# =========================

@app.route("/")
def home():
    spa_index = os.path.join(SPA_DIR, "index.html")
    if os.path.isfile(spa_index):
        return send_file(spa_index)
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    temp_original = None
    temp_path = None
    request_started = perf_counter()

    try:
        if "file" not in request.files:
            return jsonify({
                "classification": "Invalid Input",
                "confidence": 0,
                "analyzed_at": datetime.now(timezone.utc).isoformat(),
            })

        file = request.files["file"]
        temp_original = os.path.join(TEMP_DIR, f"{uuid.uuid4().hex}")
        file.save(temp_original)

        temp_path = os.path.join(TEMP_DIR, f"{uuid.uuid4().hex}.wav")

        audio = AudioSegment.from_file(temp_original)
        audio = audio.set_channels(1).set_frame_rate(SR)
        audio.export(temp_path, format="wav")

        full_audio = preprocess_audio(load_audio(temp_path))
        result = analyze_audio(full_audio)
        elapsed_ms = round((perf_counter() - request_started) * 1000, 1)
        predicted_class = result.get("cry_type") or result.get("status") or "unknown"
        log_debug_summary("prediction_timing", {
            "prediction_time_ms": elapsed_ms,
            "predicted_class": predicted_class,
            "confidence": round(float(result.get("confidence", 0.0)), 3),
            "top_predictions": result.get("top_predictions", []),
        })
        result["prediction_time_ms"] = elapsed_ms
        result["analyzed_at"] = datetime.now(timezone.utc).isoformat()
        return jsonify(result)

    except Exception as e:
        print(e)
        return jsonify({
            "classification": "Error",
            "confidence": 0,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
        })

    finally:
        try:
            if temp_original and os.path.exists(temp_original):
                os.remove(temp_original)
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass


@app.route("/<path:path>")
def spa_client_routes(path):
    if path.startswith("image/") or path == "predict":
        abort(404)
    spa_index = os.path.join(SPA_DIR, "index.html")
    if not os.path.isfile(spa_index):
        abort(404)
    base = os.path.abspath(SPA_DIR)
    target = os.path.abspath(os.path.join(SPA_DIR, path))
    if target.startswith(base + os.sep) and os.path.isfile(target):
        return send_file(target)
    return send_file(spa_index)


if __name__ == "__main__":
    port = 7860
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        if sock.connect_ex(("127.0.0.1", port)) == 0:
            port = 5000

    print(f"Server starting on http://127.0.0.1:{port}")
    try:
        app.run(debug=True, host="0.0.0.0", port=port)
    except Exception as e:
        print("Server failed to start:", e)

