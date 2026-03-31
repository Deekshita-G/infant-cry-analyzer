(function () {
  "use strict";

  const HISTORY_KEY = "ica_history_v3";
  const MAX_HISTORY = 50;

  /* Bundled SVGs under /static/illustrations/ — always load, no hotlink failures */
  const IMAGES = {
    default: "/static/illustrations/general.svg",
    asphyxia: "/static/illustrations/medical.svg",
    hungry: "/static/illustrations/feed.svg",
    sleepy: "/static/illustrations/sleep.svg",
    pain: "/static/illustrations/comfort.svg",
    tired: "/static/illustrations/sleep.svg",
    discomfort: "/static/illustrations/comfort.svg",
    lonely: "/static/illustrations/feed.svg",
    scared: "/static/illustrations/comfort.svg",
    general: "/static/illustrations/general.svg",
    human: "/static/illustrations/hero-family.svg",
    noise: "/static/illustrations/audio-check.svg",
    unclear: "/static/illustrations/audio-check.svg",
    silent: "/static/illustrations/sleep.svg",
    error: "/static/illustrations/audio-check.svg",
  };

  const CAUSE_STEPS = {
    Hunger: [
      "Offer a feed if it has been a while since the last one; watch for rooting or sucking cues.",
      "Burp gently halfway and after feeding to reduce fuss from gas.",
      "If breastfeeding, consider whether supply or latch pain could be affecting comfort (ask a lactation specialist if unsure).",
    ],
    Pain: [
      "Check for obvious sources of pain: hair tourniquet, tight clothing, diaper rash, or temperature extremes.",
      "If you suspect illness or injury, contact your pediatrician.",
      "Comfort with holding, slow rocking, and a calm voice while you assess.",
    ],
    Sleepy: [
      "Reduce stimulation: dim lights, lower voices, swaddle only if safe per your pediatric guidance.",
      "Try a calming routine: short wind-down, white noise at a safe volume, consistent sleep space.",
    ],
    Tired: [
      "Help your baby wind down with low stimulation and predictable soothing (holding, patting, shushing).",
      "Watch for early tired cues so they don’t become overtired.",
    ],
    Discomfort: [
      "Check the diaper and skin folds; change wet or soiled diapers promptly.",
      "Adjust clothing and room temperature so they’re not too warm or cold.",
    ],
    Lonely: [
      "Hold your baby skin-to-skin or in a safe carrier; slow rhythm often helps.",
      "Talk or sing softly—your voice is regulating for newborns.",
    ],
    Scared: [
      "Stay calm yourself; babies pick up caregiver stress.",
      "Hold closely, minimize sudden noise, and move to a familiar quiet space.",
    ],
    "General cry": [
      "Try the basics: feed, burp, diaper, temperature, then soothing contact.",
      "If crying is prolonged or very different from usual, call your nurse line or clinician.",
    ],
  };

  const DEFAULT_OK_STEPS = [
    "Stay with your baby and observe breathing, color, and responsiveness.",
    "Try soothing basics: hold, slow motion, gentle shushing, pacifier if you use one.",
    "If anything feels off compared to your baby’s normal, call your pediatrician.",
  ];

  const FALLBACK_GUIDANCE = {
    asphyxia: [
      "This model flags elevated risk patterns in audio — not a diagnosis.",
      "Check breathing, skin color, alertness, and muscle tone right away.",
      "If breathing looks difficult, color seems wrong, or baby is limp or unresponsive, seek emergency care immediately.",
      "Even if your baby looks fine, call your pediatrician for urgent guidance if you remain concerned.",
    ],
    human: [
      "The clip sounds more like speech than an isolated infant cry.",
      "Try again closer to the baby with less background conversation.",
    ],
    noise: [
      "Too much background noise or non-cry sound can confuse the model.",
      "Record again in a quieter setting, closer to your baby.",
    ],
    unclear: [
      "The recording may be too quiet, clipped, or distant.",
      "Move closer, speak less over the cry, and try a few seconds of clear audio.",
    ],
    silent: [
      "We couldn’t detect a sustained cry in this sample.",
      "If your baby is crying, move the mic closer and record again (3–10 seconds is enough).",
    ],
    error: [
      "Something went wrong processing this file.",
      "Try another format (WAV or MP3) or a shorter clip. If it persists, contact support for your deployment.",
    ],
    invalid: [
      "No audio file was attached.",
      "Choose a file or record from the microphone first.",
    ],
  };

  const pages = {
    home: "page-home",
    analyze: "page-analyze",
    loading: "page-loading",
    result: "page-result",
    results: "page-results",
    history: "page-history",
    about: "page-about",
    how: "page-how",
    emergency: "page-emergency",
    contact: "page-contact",
  };

  /** Larger artwork (may fail in strict networks — local SVG used on error) */
  const IMG_REMOTE = {
    cry: "https://img.icons8.com/ultraviolet/400/crying-baby.png",
    sleep:
      "https://png.pngtree.com/png-vector/20250724/ourmid/pngtree-adorable-sleeping-baby-on-cloud-png-image_16674004.webp",
    feed: "https://cdn.dribbble.com/userupload/33055919/file/original-d0f287844d8d4995692d9bb57ed6db17.png",
    medical: "https://i.etsystatic.com/46872987/r/il/d9e1cc/5853691028/il_570xN.5853691028_b2me.jpg",
  };

  /** @type {Blob|null} */
  let pendingRecordingBlob = null;
  let pendingRecordingName = "recording.webm";
  /** @type {object|null} */
  let lastResultData = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const waveMount = document.querySelector("#waveform");
    let wavesurfer = null;
    if (waveMount && typeof WaveSurfer !== "undefined") {
      try {
        wavesurfer = WaveSurfer.create({
          container: waveMount,
          waveColor: "rgba(74, 144, 201, 0.45)",
          progressColor: "#356f9e",
          cursorColor: "#356f9e",
          height: 96,
          dragToSeek: true,
        });
      } catch (err) {
        console.warn("WaveSurfer init:", err);
      }
    }

    const audioInput = document.getElementById("audioFile");
    const recordBtn = document.getElementById("recordBtn");
    const stopBtn = document.getElementById("stopBtn");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const navToggle = document.getElementById("navToggle");
    const siteNav = document.getElementById("siteNav");
    const fileDropLabel = document.getElementById("fileDropLabel");
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    const recordStatus = document.getElementById("recordStatus");

    if (!audioInput || !recordBtn || !stopBtn || !analyzeBtn || !fileNameDisplay) {
      console.error(
        "Infant Cry Analyzer: this page HTML does not match script.js (missing #audioFile, buttons, etc.)."
      );
      return;
    }

    let mediaRecorder = null;
    let audioChunks = [];
    let micStream = null;
    let recordMime = "audio/webm";

    function pickMime() {
      if (typeof MediaRecorder === "undefined") return "audio/webm";
      const c = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      for (const m of c) {
        if (MediaRecorder.isTypeSupported(m)) return m;
      }
      return "";
    }

    function setNavActive(logicalPage) {
      const map = {
        loading: "results",
        result: "results",
      };
      const navKey = map[logicalPage] || logicalPage;
      document.querySelectorAll(".nav-tab").forEach((tab) => {
        const k = tab.getAttribute("data-nav");
        tab.classList.toggle("nav-tab--active", k === navKey);
      });
    }

    function updateResultsTab() {
      const empty = document.getElementById("resultsEmpty");
      const sum = document.getElementById("resultsSummary");
      if (!empty || !sum) return;
      if (!lastResultData) {
        empty.classList.remove("is-hidden");
        sum.classList.add("is-hidden");
        return;
      }
      empty.classList.add("is-hidden");
      sum.classList.remove("is-hidden");
      const d = lastResultData;
      const cat = canonicalPredictionLabel(d.classification || "");
      const sub = document.getElementById("resultsSummarySub");
      const lbl = document.getElementById("resultsSummaryLabel");
      const cf = document.getElementById("resultsSummaryConf");
      const cc = document.getElementById("resultsSummaryCause");
      const dt = document.getElementById("resultsSummaryDate");
      if (lbl) lbl.textContent = cat;
      if (sub) sub.textContent = d.classification || "";
      if (cf)
        cf.textContent =
          typeof d.confidence === "number" ? `${(d.confidence * 100).toFixed(1)}%` : "—";
      if (cc) cc.textContent = d.possible_cause || "—";
      if (dt) dt.textContent = formatLocalTime(d.analyzed_at);
    }

    function canonicalPredictionLabel(classification) {
      const c = (classification || "").toLowerCase();
      if (c.includes("asphyxia")) return "Asphyxia Detected";
      if (c.includes("baby seems okay")) return "Baby Seems Okay";
      if (c.includes("human voice")) return "Human Voice";
      if (c.includes("other sound")) return "Other Sound";
      if (c.includes("unclear")) return "Unclear Audio";
      if (c.includes("no cry")) return "No Cry Detected";
      return classification || "—";
    }

    function showPage(name) {
      if (name === "results") {
        updateResultsTab();
      }

      const id = pages[name];
      if (!id) return;

      document.querySelectorAll(".page").forEach((p) => p.classList.add("is-hidden"));
      const el = document.getElementById(id);
      if (el) el.classList.remove("is-hidden");

      if (siteNav && navToggle) {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }

      if (name !== "loading") {
        setNavActive(name);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });

      if (name === "analyze" && wavesurfer) {
        requestAnimationFrame(() => {
          try {
            wavesurfer.setOptions({ height: 96 });
            window.dispatchEvent(new Event("resize"));
          } catch (_) {}
        });
      }

      if (name === "result" && lastResultData) {
        updateResultUI(lastResultData);
      }
    }

    document.querySelectorAll("[data-page]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const page = e.currentTarget.getAttribute("data-page");
        if (page === "home") {
          e.preventDefault();
          showPage("home");
        } else if (page) {
          showPage(page);
        }
      });
    });

    document.querySelector(".brand")?.addEventListener("click", (e) => {
      e.preventDefault();
      showPage("home");
    });

    if (navToggle && siteNav) {
      navToggle.addEventListener("click", () => {
        const open = !siteNav.classList.contains("is-open");
        siteNav.classList.toggle("is-open", open);
        navToggle.setAttribute("aria-expanded", String(open));
      });
    }

    function setRecordStatus(text) {
      if (recordStatus) recordStatus.textContent = text;
    }

    audioInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      pendingRecordingBlob = null;
      if (!file) {
        fileNameDisplay.textContent = "No file selected";
        syncHomeHint();
        return;
      }
      fileNameDisplay.textContent = file.name;
      if (wavesurfer) {
        try {
          wavesurfer.loadBlob(file);
        } catch (_) {}
      }
      setRecordStatus("File ready. Tap Analyze when you’re set.");
      syncHomeHint();
    });

    const dropZone = fileDropLabel;
    if (dropZone) {
      ["dragenter", "dragover"].forEach((ev) => {
        dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          dropZone.style.borderColor = "var(--accent, #0d9488)";
        });
      });
      ["dragleave", "drop"].forEach((ev) => {
        dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          dropZone.style.borderColor = "";
        });
      });
      dropZone.addEventListener("drop", (e) => {
        const f = e.dataTransfer?.files?.[0];
        const okType = f && /^audio\//i.test(f.type);
        const okExt = f && /\.(wav|mp3|m4a|webm|ogg|flac)$/i.test(f.name);
        if (!f || (!okType && !okExt)) {
          setRecordStatus("Please drop an audio file.");
          return;
        }
        pendingRecordingBlob = null;
        try {
          const dt = new DataTransfer();
          dt.items.add(f);
          audioInput.files = dt.files;
        } catch (_) {
          audioInput.value = "";
        }
        fileNameDisplay.textContent = f.name;
        if (wavesurfer) {
          try {
            wavesurfer.loadBlob(f);
          } catch (_) {}
        }
        setRecordStatus("File ready. Tap Analyze when you’re set.");
        syncHomeHint();
      });
    }

    function stopMicTracks() {
      if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
        micStream = null;
      }
    }

    recordBtn.addEventListener("click", async () => {
      try {
        recordMime = pickMime();
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        pendingRecordingName = (recordMime || "").includes("mp4")
          ? "recording.m4a"
          : "recording.webm";
        mediaRecorder = new MediaRecorder(
          micStream,
          recordMime ? { mimeType: recordMime } : undefined
        );
        audioChunks = [];
        mediaRecorder.ondataavailable = (ev) => {
          if (ev.data.size) audioChunks.push(ev.data);
        };
        mediaRecorder.onstop = () => {
          stopMicTracks();
          const blob = new Blob(audioChunks, {
            type: mediaRecorder.mimeType || recordMime || "audio/webm",
          });
          pendingRecordingBlob = blob;
          audioInput.value = "";
          fileNameDisplay.textContent = "Microphone capture (ready to analyze)";
          if (wavesurfer) {
            try {
              wavesurfer.loadBlob(blob);
            } catch (_) {}
          }
          setRecordStatus("Recording saved on this device only until you analyze.");
          syncHomeHint();
          recordBtn.classList.remove("is-hidden");
          recordBtn.setAttribute("aria-pressed", "false");
          stopBtn.classList.add("is-hidden");
        };
        mediaRecorder.start(200);
        recordBtn.setAttribute("aria-pressed", "true");
        stopBtn.classList.remove("is-hidden");
        recordBtn.classList.add("is-hidden");
        setRecordStatus("Recording… tap Stop when you’ve captured the cry.");
      } catch (err) {
        console.error(err);
        setRecordStatus("Microphone access failed. Check permissions and try again.");
        alert("Microphone access is needed to record. Allow audio in your browser settings.");
      }
    });

    stopBtn.addEventListener("click", () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    });

    analyzeBtn.addEventListener("click", () => analyzeCry());

    async function analyzeCry() {
      const file = audioInput.files?.[0];
      let bodyFile = file;
      let filename = file?.name || "audio";

      if (!bodyFile && pendingRecordingBlob) {
        bodyFile = pendingRecordingBlob;
        filename = pendingRecordingName;
      }

      if (!bodyFile) {
        setRecordStatus(FALLBACK_GUIDANCE.invalid[1]);
        alert("Please upload an audio file or record a cry first.");
        showPage("analyze");
        return;
      }

      showPage("loading");

      try {
        const formData = new FormData();
        formData.append("file", bodyFile, filename);

        const response = await fetch("/predict", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        lastResultData = data;
        updateResultsTab();
        updateResultUI(data);
        saveHistoryEntry(data);
        renderHistoryList();
        showPage("result");
      } catch (error) {
        console.error(error);
        const data = {
          classification: "Error",
          confidence: 0,
          analyzed_at: new Date().toISOString(),
        };
        lastResultData = data;
        updateResultsTab();
        updateResultUI(data);
        showPage("result");
      }
    }

    function formatLocalTime(iso) {
      if (!iso) return new Date().toLocaleString();
      const d = new Date(iso);
      return isNaN(d.getTime()) ? new Date().toLocaleString() : d.toLocaleString();
    }

    function updateResultUI(data) {
      const classification = data.classification || "Unknown";
      const conf = typeof data.confidence === "number" ? data.confidence : 0;
      const causeRaw = data.possible_cause || "";
      const analyzedAt = data.analyzed_at;

      const cryTypeEl = document.getElementById("cryType");
      const predictionCategoryEl = document.getElementById("predictionCategory");
      const badgeEl = document.getElementById("resultBadge");
      const subtitleEl = document.getElementById("resultSubtitle");
      const confEl = document.getElementById("confValue");
      const timeEl = document.getElementById("resultTime");
      const barWrap = document.getElementById("confidenceBarWrap");
      const barFill = document.getElementById("confidenceBarFill");
      const imgEl = document.getElementById("resultImage");
      const causeBlock = document.getElementById("causeBlock");
      const causeText = document.getElementById("causeText");
      const causeDisclaimer = document.getElementById("causeDisclaimer");
      const guidanceList = document.getElementById("guidanceList");

      const cLower = classification.toLowerCase();
      let headline = classification;
      let subtitle = "";
      let badgeClass = "";
      let kind = "default";
      let showCause = false;
      let showConfBar = false;
      let confLabel = "";

      if (cLower.includes("asphyxia")) {
        headline = "Elevated asphyxia risk signal";
        subtitle =
          "The model assigns higher probability to patterns seen in concerning cries. This is not a diagnosis.";
        kind = "asphyxia";
        badgeClass = "badge-danger";
        showConfBar = true;
        confLabel = `Model score: ${(conf * 100).toFixed(1)}%`;
      } else if (cLower.includes("baby seems okay")) {
        headline = "Baby cry detected — your baby may be okay";
        subtitle =
          "A cry was detected and the primary risk estimate is below the alert threshold. Continue to observe your baby.";
        kind = "baby_ok";
        badgeClass = "badge-muted";
        showCause = !!causeRaw;
        showConfBar = true;
        confLabel = `Confidence in “okay” pattern: ${(conf * 100).toFixed(1)}%`;
      } else if (cLower.includes("human voice")) {
        headline = "Human voice";
        subtitle = "We hear adult speech more clearly than an isolated infant cry.";
        kind = "human";
        badgeClass = "badge-warn";
        confLabel = "Not applicable";
      } else if (cLower.includes("other sound")) {
        headline = "Other sound / background noise";
        subtitle = "Try again with the microphone closer to your baby and less background noise.";
        kind = "noise";
        badgeClass = "badge-warn";
        confLabel = "Not applicable";
      } else if (cLower.includes("unclear")) {
        headline = "Unclear audio";
        subtitle = "Improve clarity and volume, then record again.";
        kind = "unclear";
        badgeClass = "badge-warn";
        confLabel = "Not applicable";
      } else if (cLower.includes("no cry")) {
        headline = "No cry detected";
        subtitle = "The recording may be too quiet or not contain a sustained cry.";
        kind = "silent";
        badgeClass = "badge-muted";
        confLabel = "Not applicable";
      } else if (cLower.includes("invalid")) {
        headline = "Missing or invalid audio";
        subtitle = "The server did not receive a usable audio file.";
        kind = "invalid";
        badgeClass = "badge-warn";
        confLabel = "—";
      } else if (cLower.includes("error")) {
        headline = "Something went wrong";
        subtitle = "We could not complete analysis for this clip.";
        kind = "error";
        badgeClass = "badge-warn";
        confLabel = "—";
      } else {
        confLabel = `${(conf * 100).toFixed(1)}%`;
        showConfBar = conf > 0;
      }

      if (
        !cryTypeEl ||
        !predictionCategoryEl ||
        !subtitleEl ||
        !badgeEl ||
        !confEl ||
        !timeEl ||
        !barWrap ||
        !barFill ||
        !imgEl ||
        !causeBlock ||
        !causeText ||
        !causeDisclaimer ||
        !guidanceList
      ) {
        console.warn("Result UI: missing elements");
        return;
      }

      cryTypeEl.textContent = headline;
      predictionCategoryEl.textContent = "Prediction: " + canonicalPredictionLabel(classification);
      subtitleEl.textContent = subtitle;

      badgeEl.textContent =
        kind === "baby_ok"
          ? "Baby cry"
          : kind === "asphyxia"
            ? "Medical attention"
            : kind === "human"
              ? "Not baby cry"
              : "Result";
      badgeEl.className = "badge " + (badgeClass || "");

      if (!confLabel) {
        confLabel = conf > 0 ? `${(conf * 100).toFixed(1)}%` : "Not applicable";
      }
      confEl.textContent = confLabel;
      timeEl.textContent = formatLocalTime(analyzedAt);

      if (showConfBar && conf > 0) {
        barWrap.classList.remove("is-hidden");
        barFill.style.width = `${Math.min(100, Math.max(4, conf * 100))}%`;
      } else {
        barWrap.classList.add("is-hidden");
        barFill.style.width = "0%";
      }

      const causeKey = mapCauseKey(causeRaw);
      applyResultImage(imgEl, kind, causeKey);
      imgEl.alt = illustrativeAlt(kind, causeRaw);

      if (showCause && causeRaw) {
        causeBlock.classList.remove("is-hidden");
        causeText.textContent = `Possible cause: ${causeRaw}`;
        causeDisclaimer.textContent =
          "This label is a lightweight hint from audio features—not a clinical finding. Use it alongside your own observations.";
      } else {
        causeBlock.classList.add("is-hidden");
        causeText.textContent = "";
        causeDisclaimer.textContent = "";
      }

      guidanceList.innerHTML = "";
      const steps = buildGuidance(kind, causeRaw);
      steps.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        guidanceList.appendChild(li);
      });
    }

    function mapCauseKey(causeRaw) {
      const s = (causeRaw || "").toLowerCase();
      if (s.includes("hunger") || s.includes("hungry")) return "hungry";
      if (s.includes("pain")) return "pain";
      if (s.includes("sleepy")) return "sleepy";
      if (s.includes("tired")) return "tired";
      if (s.includes("discomfort")) return "discomfort";
      if (s.includes("lonely")) return "lonely";
      if (s.includes("scared")) return "scared";
      if (s.includes("general")) return "general";
      return "general";
    }

    function pickImage(kind, causeKey) {
      if (kind === "asphyxia") return IMAGES.asphyxia;
      if (kind === "human") return IMAGES.human;
      if (kind === "noise") return IMAGES.noise;
      if (kind === "unclear") return IMAGES.unclear;
      if (kind === "silent") return IMAGES.silent;
      if (kind === "invalid") return IMAGES.unclear;
      if (kind === "error") return IMAGES.error;
      if (kind === "baby_ok") {
        const map = {
          hungry: IMAGES.hungry,
          pain: IMAGES.pain,
          sleepy: IMAGES.sleepy,
          tired: IMAGES.tired,
          discomfort: IMAGES.discomfort,
          lonely: IMAGES.lonely,
          scared: IMAGES.scared,
          general: IMAGES.general,
        };
        return map[causeKey] || IMAGES.default;
      }
      return IMAGES.default;
    }

    function applyResultImage(imgEl, kind, causeKey) {
      const fallback = pickImage(kind, causeKey);
      let primary = fallback;
      if (kind === "asphyxia") {
        primary = IMG_REMOTE.medical;
      } else if (kind === "baby_ok") {
        if (causeKey === "hungry" || causeKey === "lonely") primary = IMG_REMOTE.feed;
        else if (causeKey === "sleepy" || causeKey === "tired") primary = IMG_REMOTE.sleep;
        else primary = IMG_REMOTE.cry;
      } else if (kind === "human" || kind === "noise") {
        primary = IMG_REMOTE.cry;
      }
      imgEl.onerror = function () {
        this.onerror = null;
        this.src = fallback;
      };
      imgEl.src = primary;
    }

    function illustrativeAlt(kind, causeRaw) {
      if (kind === "asphyxia") return "Medical attention icon";
      if (kind === "baby_ok" && causeRaw) return `Illustration suggesting ${causeRaw}`;
      if (kind === "human") return "Calm illustration — adult voice detected";
      return "Supportive illustration for analysis result";
    }

    function buildGuidance(kind, causeRaw) {
      if (kind === "asphyxia") return FALLBACK_GUIDANCE.asphyxia;
      if (kind === "human") return FALLBACK_GUIDANCE.human;
      if (kind === "noise") return FALLBACK_GUIDANCE.noise;
      if (kind === "unclear") return FALLBACK_GUIDANCE.unclear;
      if (kind === "silent") return FALLBACK_GUIDANCE.silent;
      if (kind === "invalid") return FALLBACK_GUIDANCE.invalid;
      if (kind === "error") return FALLBACK_GUIDANCE.error;
      if (kind === "baby_ok") {
        const key = causeRaw.trim();
        if (key && CAUSE_STEPS[key]) return CAUSE_STEPS[key];
        return DEFAULT_OK_STEPS;
      }
      return DEFAULT_OK_STEPS;
    }

    function saveHistoryEntry(data) {
      const entry = {
        at: data.analyzed_at || new Date().toISOString(),
        classification: data.classification || "",
        confidence: data.confidence ?? 0,
        possible_cause: data.possible_cause || "",
      };
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      } catch (_) {
        list = [];
      }
      if (!Array.isArray(list)) list = [];
      list.unshift(entry);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
    }

    function renderHistoryList() {
      const ul = document.getElementById("historyList");
      const empty = document.getElementById("historyEmpty");
      const wrap = document.getElementById("historyTableWrap");
      const tb = document.getElementById("historyTableBody");
      if (!ul || !empty) return;
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      } catch (_) {
        list = [];
      }
      if (!list.length) {
        ul.hidden = true;
        if (wrap) wrap.hidden = true;
        if (tb) tb.innerHTML = "";
        empty.hidden = false;
        ul.innerHTML = "";
        return;
      }
      empty.hidden = true;
      if (wrap) wrap.hidden = false;
      ul.hidden = false;
      ul.innerHTML = "";
      if (tb) tb.innerHTML = "";

      list.forEach((item) => {
        const confStr =
          typeof item.confidence === "number"
            ? `${(item.confidence * 100).toFixed(1)}%`
            : "—";
        const cause = item.possible_cause || "—";

        if (tb) {
          const tr = document.createElement("tr");
          ["td", "td", "td", "td"].forEach(() => tr.appendChild(document.createElement("td")));
          tr.cells[0].textContent = formatLocalTime(item.at);
          tr.cells[1].textContent = item.classification || "Unknown";
          tr.cells[2].textContent = confStr;
          tr.cells[3].textContent = cause;
          tb.appendChild(tr);
        }

        const li = document.createElement("li");
        li.className = "history-item";
        const date = document.createElement("div");
        date.className = "history-date";
        date.textContent = formatLocalTime(item.at);
        const res = document.createElement("div");
        res.className = "history-result";
        res.textContent = item.classification || "Unknown";
        const det = document.createElement("div");
        det.className = "history-detail";
        det.textContent = `${confStr} · cause: ${cause}`;
        li.appendChild(date);
        li.appendChild(res);
        li.appendChild(det);
        ul.appendChild(li);
      });
    }

    function syncHomeHint() {
      const homeHint = document.getElementById("homeFileHint");
      if (!homeHint) return;
      const f = audioInput.files?.[0];
      if (pendingRecordingBlob && !f) {
        homeHint.innerHTML =
          "<strong>Recording captured.</strong> Open <strong>Analyze Cry</strong> and tap <strong>Run analysis</strong>, or tap <strong>Analyze</strong> below.";
        return;
      }
      homeHint.innerHTML = f
        ? `Ready: <strong>${f.name}</strong> — tap <strong>Analyze</strong> here or use <strong>Analyze Cry</strong>.`
        : "No file yet. Use <strong>Upload file</strong> or <strong>Record</strong>, then <strong>Analyze</strong>.";
    }

    document.getElementById("homeBtnChooseFile")?.addEventListener("click", () => {
      showPage("analyze");
      requestAnimationFrame(() => audioInput.click());
    });
    document.getElementById("homeBtnRecord")?.addEventListener("click", () => {
      showPage("analyze");
      requestAnimationFrame(() => recordBtn.click());
    });
    document.getElementById("homeBtnAnalyze")?.addEventListener("click", () => {
      if (!audioInput.files?.[0] && !pendingRecordingBlob) {
        alert("Please upload or record audio first (use the buttons above or open Analyze Cry).");
        showPage("analyze");
        return;
      }
      analyzeCry();
    });
    document.getElementById("btnViewFullResult")?.addEventListener("click", () => {
      if (lastResultData) showPage("result");
    });

    renderHistoryList();
    updateResultsTab();
    syncHomeHint();
    showPage("home");
  }
})();
