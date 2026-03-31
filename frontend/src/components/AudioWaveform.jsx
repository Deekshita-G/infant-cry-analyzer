import { Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const BAR_COUNT = 56

function fallbackBars() {
  return Array.from({ length: BAR_COUNT }, (_, index) => {
    const curve = Math.sin((index / (BAR_COUNT - 1)) * Math.PI)
    return 0.18 + curve * 0.42
  })
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function decodeBars(url) {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return fallbackBars()

  const ctx = new AudioCtx()
  try {
    const audioBuffer = await ctx.decodeAudioData(buffer.slice(0))
    const channel = audioBuffer.getChannelData(0)
    const blockSize = Math.max(1, Math.floor(channel.length / BAR_COUNT))
    const bars = Array.from({ length: BAR_COUNT }, (_, index) => {
      let sum = 0
      const start = index * blockSize
      const end = Math.min(channel.length, start + blockSize)
      for (let cursor = start; cursor < end; cursor += 1) {
        sum += Math.abs(channel[cursor])
      }
      return Math.max(0.08, Math.min(1, (sum / Math.max(1, end - start)) * 3.2))
    })
    return bars.some((value) => value > 0.1) ? bars : fallbackBars()
  } finally {
    await ctx.close()
  }
}

export function AudioWaveform({ src, fileName }) {
  const audioRef = useRef(null)
  const [bars, setBars] = useState(() => fallbackBars())
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!src) return undefined
    let active = true
    setBars(fallbackBars())
    decodeBars(src)
      .then((nextBars) => {
        if (active) setBars(nextBars)
      })
      .catch(() => {
        if (active) setBars(fallbackBars())
      })

    return () => {
      active = false
    }
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return undefined

    const syncTime = () => {
      setCurrentTime(audio.currentTime || 0)
      setDuration(audio.duration || 0)
    }
    const onEnded = () => setIsPlaying(false)
    const onPause = () => setIsPlaying(false)
    const onPlay = () => setIsPlaying(true)

    syncTime()
    audio.addEventListener('timeupdate', syncTime)
    audio.addEventListener('loadedmetadata', syncTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('play', onPlay)

    return () => {
      audio.removeEventListener('timeupdate', syncTime)
      audio.removeEventListener('loadedmetadata', syncTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('play', onPlay)
    }
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!src || !audio) return
    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
    setCurrentTime(0)
  }, [src])

  const progress = useMemo(() => {
    if (!duration) return 0
    return Math.max(0, Math.min(100, (currentTime / duration) * 100))
  }, [currentTime, duration])

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      await audio.play()
      return
    }
    audio.pause()
  }

  if (!src) {
    return (
      <div className="ica-waveform-empty">
        <div className="ica-waveform-empty-bars" aria-hidden>
          {fallbackBars().map((height, index) => (
            <span key={index} style={{ height: `${height * 72}px` }} />
          ))}
        </div>
        <p>Waveform preview will appear here after you upload or record audio.</p>
      </div>
    )
  }

  return (
    <div className="ica-waveform-card">
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="ica-waveform-header">
        <div>
          <p className="ica-eyebrow">Audio preview</p>
          <h3>{fileName || 'Recorded cry sample'}</h3>
        </div>
        <div className="ica-waveform-time">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="ica-waveform-shell">
        <button
          type="button"
          className="ica-waveform-toggle"
          onClick={togglePlayback}
          aria-label={isPlaying ? 'Pause audio preview' : 'Play audio preview'}
        >
          {isPlaying ? <Pause size={20} aria-hidden /> : <Play size={20} aria-hidden />}
        </button>

        <div className="ica-waveform-visual" role="img" aria-label="Audio waveform preview">
          <div className="ica-waveform-progress" style={{ width: `${progress}%` }} />
          <div className="ica-waveform-bars" aria-hidden>
            {bars.map((height, index) => (
              <span
                key={index}
                className={isPlaying ? 'is-playing' : ''}
                style={{
                  height: `${Math.max(10, height * 92)}px`,
                  animationDelay: `${index * 0.02}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
