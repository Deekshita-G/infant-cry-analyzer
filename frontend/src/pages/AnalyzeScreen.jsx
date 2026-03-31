import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, Square, Upload, AudioLines, PlayCircle } from 'lucide-react'
import { AudioWaveform } from '../components/AudioWaveform'
import { predictAudio } from '../lib/predictApi'
import { pushHistory, saveLastResult } from '../lib/resultModel'

const MAX_RECORDING_MS = 20000

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const mime of options) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

export function AnalyzeScreen() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const previewUrlRef = useRef('')

  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const setAudioPreview = (file, label = file?.name || 'Selected audio') => {
    if (!file) return

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const nextUrl = URL.createObjectURL(file)
    previewUrlRef.current = nextUrl

    setSelectedFile(file)
    setPreviewUrl(nextUrl)
    setSourceLabel(label)
  }

  const handlePickedFile = (event) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    setAudioPreview(nextFile, nextFile.name)
  }

  const startRecord = async () => {
    try {
      const mime = pickMime()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })

      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current)
          timerRef.current = null
        }

        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || 'audio/webm' })
        const extension = (recorder.mimeType || '').includes('mp4') ? 'm4a' : 'webm'
        const file = new File([blob], `recorded-cry.${extension}`, { type: blob.type || 'audio/webm' })

        setRecording(false)
        setAudioPreview(file, 'Recorded cry sample')
      }

      recorder.start(200)
      timerRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, MAX_RECORDING_MS)
      setRecording(true)
    } catch (error) {
      console.error(error)
    }
  }

  const stopRecord = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    recorderRef.current = null
  }

  const runAnalysis = async () => {
    if (!selectedFile || busy) return

    setBusy(true)
    try {
      const data = await predictAudio(selectedFile)
      saveLastResult(data)
      pushHistory({
        at: data.analyzed_at || new Date().toISOString(),
        classification: data.classification,
        confidence: data.confidence,
        possible_cause: data.possible_cause || data.cry_type,
      })
      navigate('/result', { state: { result: data } })
    } catch (error) {
      console.error(error)
      const fallbackResult = {
        classification: 'Error',
        status: 'error',
        confidence: 0,
        analyzed_at: new Date().toISOString(),
      }
      saveLastResult(fallbackResult)
      navigate('/result', { state: { result: fallbackResult } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ica-page-stack">
      <section className="ica-page-hero">
        <div>
          <span className="ica-kicker">Main interaction screen</span>
          <h1 className="ica-section-title">Analyze Cry</h1>
          <p className="ica-lead">
            Upload or record an infant cry clip, review the waveform preview, then analyze when you are ready.
          </p>
        </div>
      </section>

      <section className="ica-analyze-grid">
        <div className="ica-card ica-upload-card">
          <div className="ica-card-pad">
            <div className="ica-panel-header">
              <div className="ica-panel-icon">
                <Upload size={20} aria-hidden />
              </div>
              <div>
                <p className="ica-eyebrow">Audio input</p>
                <h2 className="ica-panel-title">Upload or record</h2>
              </div>
            </div>

            <div className="ica-input-actions">
              <button type="button" className="ica-btn ica-btn--secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
                <Upload size={18} aria-hidden />
                Upload audio
              </button>
              {!recording ? (
                <button type="button" className="ica-btn ica-btn--secondary" onClick={startRecord} disabled={busy}>
                  <Mic size={18} aria-hidden />
                  Record audio
                </button>
              ) : (
                <button type="button" className="ica-btn ica-btn--danger" onClick={stopRecord}>
                  <Square size={18} fill="currentColor" aria-hidden />
                  Stop recording
                </button>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.flac"
                hidden
                onChange={handlePickedFile}
              />
            </div>

            <div className="ica-capture-note">
              <strong>Recommended:</strong> record up to 20 seconds and keep the microphone close to the infant for the
              clearest sample.
            </div>
          </div>
        </div>

        <div className="ica-card ica-waveform-panel">
          <div className="ica-card-pad">
            <div className="ica-panel-header">
              <div className="ica-panel-icon">
                <AudioLines size={20} aria-hidden />
              </div>
              <div>
                <p className="ica-eyebrow">Waveform preview</p>
                <h2 className="ica-panel-title">Review selected audio</h2>
              </div>
            </div>

            <AudioWaveform src={previewUrl} fileName={sourceLabel} />
          </div>
        </div>
      </section>

      <div className="ica-analyze-cta">
        <button
          type="button"
          className="ica-btn ica-btn--primary ica-btn--cta"
          onClick={runAnalysis}
          disabled={!selectedFile || busy || recording}
        >
          <PlayCircle size={20} aria-hidden />
          {busy ? 'Analyzing audio...' : 'Analyze'}
        </button>
      </div>
    </div>
  )
}
