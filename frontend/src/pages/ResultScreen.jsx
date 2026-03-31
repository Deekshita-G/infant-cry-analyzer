import { useMemo } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Clock3, Home, Mic } from 'lucide-react'
import { interpretResult, loadLastResult } from '../lib/resultModel'

function formatTime(iso) {
  if (!iso) return new Date().toLocaleString()
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? new Date().toLocaleString() : date.toLocaleString()
}

export function ResultScreen() {
  const { state } = useLocation()
  const data = state?.result || loadLastResult()
  const ui = useMemo(() => (data ? interpretResult(data) : null), [data])

  if (!data || !ui) {
    return <Navigate to="/analyze" replace />
  }

  return (
    <div className="ica-page-stack">
      <section className={`ica-result-banner ${ui.bannerClass}`}>
        <div className="ica-result-banner-top">
          <span className={`ica-badge ${ui.badgeClass}`}>{ui.badge}</span>
          <div className="ica-result-stamp">
            <Clock3 size={16} aria-hidden />
            {formatTime(ui.analyzedAt)}
          </div>
        </div>
        <h1 className="ica-section-title">Results</h1>
        <p className="ica-result-subtitle">{ui.subtitle}</p>
      </section>

      <section className="ica-result-layout">
        <aside className="ica-card ica-result-media-card">
          <div className="ica-card-pad">
            <div className="ica-result-photo-shell">
              <img src={ui.imageUrl} alt={ui.imageAlt} width={420} height={420} loading="lazy" />
            </div>
          </div>
        </aside>

        <div className="ica-result-content-column">
          <div className="ica-card">
            <div className="ica-card-pad">
              <p className="ica-eyebrow">Prediction Result</p>
              <h2 className="ica-result-main-title">{ui.predictionLabel}</h2>
            </div>
          </div>

          <div className="ica-card ica-result-cause-card">
            <div className="ica-card-pad">
              <p className="ica-eyebrow">Possible Cause</p>
              <h2>{ui.causeLabel}</h2>
            </div>
          </div>

          <div className="ica-card">
            <div className="ica-card-pad">
              <p className="ica-eyebrow">Confidence Score</p>
              <div className="ica-confidence-row">
                <h2>{ui.confLabel}</h2>
              </div>
              <div className="ica-meter">
                <span style={{ width: `${ui.confidenceValue}%` }} />
              </div>
            </div>
          </div>

          <div className="ica-card ica-guidance-card">
            <div className="ica-card-pad">
              <p className="ica-eyebrow">What to Do Now</p>
              <ul className="ica-list">
                {ui.precautions.slice(0, 3).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="ica-result-actions">
        <Link to="/analyze" className="ica-btn ica-btn--primary">
          <Mic size={18} aria-hidden />
          New analysis
        </Link>
        <Link to="/" className="ica-btn ica-btn--secondary">
          <Home size={18} aria-hidden />
          Home
        </Link>
      </div>
    </div>
  )
}
