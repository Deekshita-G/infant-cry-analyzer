import { useMemo } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Home, Mic, Clock3 } from 'lucide-react'
import { interpretResult } from '../lib/resultModel'

function formatTime(iso) {
  if (!iso) return new Date().toLocaleString()
  const date = new Date(iso)
  return isNaN(date.getTime()) ? new Date().toLocaleString() : date.toLocaleString()
}

export function Result() {
  const { state } = useLocation()
  const data = state?.result
  const ui = useMemo(() => (data ? interpretResult(data) : null), [data])

  if (!data || !ui) {
    return <Navigate to="/analyze" replace />
  }

  return (
    <div className="ica-result-screen ica-result-screen--focused">
      <div className="ica-card ica-result-card ica-result-card--focused">
        <div className={`ica-result-banner ${ui.bannerClass}`}>
          <div className="ica-result-banner-top ica-result-banner-top--centered">
            <span className={`ica-badge ${ui.badgeClass}`}>{ui.badge}</span>
            <div className="ica-result-stamp">
              <Clock3 size={16} aria-hidden />
              {formatTime(ui.analyzedAt)}
            </div>
          </div>
          <h1 className="ica-font-display ica-result-headline ica-result-headline--centered">{ui.headline}</h1>
          {ui.subtitle ? <p className="ica-result-subtitle ica-result-subtitle--centered">{ui.subtitle}</p> : null}
        </div>

        <div className="ica-result-focus-body">
          <div className="ica-result-compact-card">
            <div className="ica-result-compact-media">
                <div className="ica-result-photo-shell ica-result-photo-shell--compact">
                  <img src={ui.imageUrl} alt={ui.imageAlt} width={200} height={200} loading="lazy" />
                </div>
            </div>

            <div className="ica-result-compact-content">
              <div className="ica-result-type-card ica-result-type-card--compact">
                <p className="ica-eyebrow">Detected Cry Type</p>
                <h2>{ui.cryTypeLabel}</h2>
              </div>

              <div className="ica-info-card ica-info-card--compact ica-info-card--left">
                <p className="ica-eyebrow">Confidence</p>
                <h2>{ui.confLabel}</h2>
              </div>

              <div className="ica-info-card ica-info-card--compact ica-info-card--left">
                <p className="ica-eyebrow">What you can do</p>
                <ul className="ica-list ica-list--compact">
                  {ui.precautions.slice(0, 3).map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="ica-result-actions ica-result-actions--centered">
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
      </div>
    </div>
  )
}
