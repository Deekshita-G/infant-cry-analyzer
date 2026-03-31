import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Mic, Square } from 'lucide-react'
import { predictAudio } from '../lib/predictApi'
import { pushHistory } from '../lib/resultModel'

const MAX_RECORDING_MS = 6000

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const mime of opts) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

export function Analyze() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const stopTimerRef = useRef(null)

  useEffect(() => () => {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const onPickFile = (event) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    void analyze(nextFile)
  }

  const onDrop = (event) => {
    event.preventDefault()
    const nextFile = event.dataTransfer.files?.[0]
    const okType = nextFile && /^audio\//i.test(nextFile.type)
    const okExt = nextFile && /\.(wav|mp3|m4a|webm|ogg|flac)$/i.test(nextFile.name)
    if (!nextFile || (!okType && !okExt)) return
    void analyze(nextFile)
  }

  const startRecord = async () => {
    try {
      const mime = pickMime()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      recRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        if (stopTimerRef.current) {
          window.clearTimeout(stopTimerRef.current)
          stopTimerRef.current = null
        }
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || 'audio/webm' })
        const ext = (recorder.mimeType || '').includes('mp4') ? 'm4a' : 'webm'
        setRecording(false)
        const file = new File([blob], `recording.${ext}`, { type: blob.type || 'audio/webm' })
        void analyze(file)
      }
      recorder.start(200)
      stopTimerRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, MAX_RECORDING_MS)
      setRecording(true)
    } catch (error) {
      console.error(error)
    }
  }

  const stopRecord = () => {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
    if (recRef.current?.state === 'recording') recRef.current.stop()
    recRef.current = null
  }

  const analyze = useCallback(async (file) => {
    if (!file || busy) return
    setBusy(true)
    try {
      const data = await predictAudio(file)
      pushHistory({
        at: data.analyzed_at || new Date().toISOString(),
        classification: data.classification,
        confidence: data.confidence,
        possible_cause: data.possible_cause || data.cry_type,
      })
      navigate('/result', { state: { result: data } })
    } catch (error) {
      console.error(error)
      navigate('/result', {
        state: {
          result: {
            classification: 'Error',
            status: 'error',
            confidence: 0,
            analyzed_at: new Date().toISOString(),
          },
        },
      })
    } finally {
      setBusy(false)
    }
  }, [busy, navigate])

  return (
    <div className="ica-analyze-minimal">
      <div className="ica-analyze-heading">
        <h1 className="ica-section-title">Analyze Baby Cry</h1>
      </div>

      <div className="ica-card">
        <div className="ica-card-pad ica-analyze-minimal-card">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            onClick={() => !busy && inputRef.current?.click()}
            className="ica-dropzone"
          >
            <input ref={inputRef} type="file" accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.flac" hidden onChange={onPickFile} />
            <Upload size={36} color="#0d9488" style={{ opacity: 0.9 }} aria-hidden />
            <p className="ica-dropzone-title">Upload audio</p>
            <p className="ica-dropzone-meta">{busy ? 'Analyzing audio...' : 'Best with a clear 5-7 second clip'}</p>
          </div>

          <div className="ica-analyze-actions ica-analyze-actions--minimal">
            {!recording ? (
              <button type="button" onClick={startRecord} disabled={busy} className="ica-btn ica-btn--secondary">
                <Mic size={20} aria-hidden />
                {busy ? 'Analyzing...' : 'Record'}
              </button>
            ) : (
              <button type="button" onClick={stopRecord} className="ica-btn ica-btn--danger">
                <Square size={18} fill="currentColor" aria-hidden />
                Stop (max 6s)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

