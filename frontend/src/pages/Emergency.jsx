import { Phone, Ambulance, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Emergency() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <span className="ica-kicker" style={{ background: '#fee2e2', color: '#991b1b' }}>
        Important
      </span>
      <h1 className="ica-section-title" style={{ color: '#7f1d1d' }}>
        Emergency guidance
      </h1>

      <div className="ica-card" style={{ border: '3px solid #fecaca', marginTop: '1.25rem' }}>
        <div className="ica-card-pad">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Ambulance size={26} color="#991b1b" aria-hidden />
            </div>
            <div>
              <h2 className="ica-font-display" style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#7f1d1d' }}>
                Call emergency services
              </h2>
              <p style={{ margin: 0, color: '#450a0a', lineHeight: 1.6 }}>
                If your baby is struggling to breathe, turns blue or gray, is unresponsive, is having a seizure, or you
                believe their life is at risk, <strong>call your local emergency number immediately</strong>.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Phone size={24} color="#9a3412" aria-hidden />
            </div>
            <div>
              <h2 className="ica-font-display" style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#7c2d12' }}>
                Urgent care / nurse line
              </h2>
              <p style={{ margin: 0, color: '#431407', lineHeight: 1.6 }}>
                Seek urgent advice for persistent high fever in a young infant, poor feeding with dehydration signs,
                repeated projectile vomiting, blood in stool, or inconsolable crying that is very different from usual—
                especially with lethargy or a bulging soft spot.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#bae6fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Stethoscope size={24} color="#075985" aria-hidden />
            </div>
            <div>
              <h2 className="ica-font-display" style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#0c4a6e' }}>
                This app cannot see everything
              </h2>
              <p style={{ margin: 0, color: '#0f172a', lineHeight: 1.6 }}>
                Audio analysis can be wrong or incomplete. Trust your instincts and your pediatrician—not a screen.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <Link to="/analyze" className="ica-btn ica-btn--secondary">
          Back to analysis
        </Link>
      </div>
    </div>
  )
}
