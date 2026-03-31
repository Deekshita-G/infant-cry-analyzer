import { Link } from 'react-router-dom'
import { loadHistory } from '../lib/resultModel'
import { Clock, ChevronRight } from 'lucide-react'

function formatTime(iso) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

export function History() {
  const items = loadHistory()

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <span className="ica-kicker">On this device</span>
      <h1 className="ica-section-title">Analysis history</h1>
      <p className="ica-lead" style={{ marginBottom: '1.5rem' }}>
        Recent runs are saved in your browser. Clearing site data removes this list.
      </p>

      {items.length === 0 ? (
        <div className="ica-card ica-card-pad" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Clock size={40} color="#0d9488" style={{ margin: '0 auto 1rem', opacity: 0.85 }} aria-hidden />
          <p style={{ margin: 0, color: 'var(--ica-muted)', fontSize: '1.05rem' }}>No saved analyses yet.</p>
          <Link to="/analyze" className="ica-btn ica-btn--primary" style={{ marginTop: '1.25rem' }}>
            Analyze a cry
            <ChevronRight size={18} aria-hidden />
          </Link>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item, i) => (
            <li key={`${item.at}-${i}`} className="ica-card ica-card-pad" style={{ padding: '1.15rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg,#ccfbf1,#a5f3fc)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Clock size={20} color="#0f766e" aria-hidden />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ica-muted)' }}>{formatTime(item.at)}</div>
                  <div style={{ fontWeight: 700, color: 'var(--ica-ink)', marginTop: '0.2rem' }}>{item.classification}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--ica-muted)', marginTop: '0.25rem' }}>
                    {typeof item.confidence === 'number' ? `${(item.confidence * 100).toFixed(1)}% confidence` : '—'}
                    {item.possible_cause ? ` · ${item.possible_cause}` : ''}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
