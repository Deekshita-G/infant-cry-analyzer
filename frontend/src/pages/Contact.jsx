import { Mail, MessageCircle } from 'lucide-react'

export function Contact() {
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <span className="ica-kicker">Support</span>
      <h1 className="ica-section-title">Contact & help</h1>

      <div className="ica-card" style={{ marginTop: '1.25rem' }}>
        <div className="ica-card-pad">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="ica-feature-icon" style={{ background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', marginBottom: 0 }}>
              <Mail size={22} color="#1d4ed8" aria-hidden />
            </div>
            <div>
              <h2 className="ica-font-display" style={{ margin: '0 0 0.5rem', fontSize: '1.15rem' }}>
                Product & technical issues
              </h2>
              <p style={{ margin: 0, color: 'var(--ica-muted)', lineHeight: 1.6 }}>
                Reach your project maintainer or repository owner for deployment, bugs, or feature requests.
              </p>
            </div>
          </div>

          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="ica-feature-icon" style={{ background: 'linear-gradient(135deg,#fce7f3,#fbcfe8)', marginBottom: 0 }}>
              <MessageCircle size={22} color="#be185d" aria-hidden />
            </div>
            <div>
              <h2 className="ica-font-display" style={{ margin: '0 0 0.5rem', fontSize: '1.15rem' }}>
                Health questions
              </h2>
              <p style={{ margin: 0, color: 'var(--ica-muted)', lineHeight: 1.6 }}>
                For concerns about your child, contact your <strong style={{ color: 'var(--ica-ink)' }}>pediatrician</strong>{' '}
                or nurse advice line—not this application.
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: 'var(--ica-radius)',
              background: '#f8fafc',
              fontSize: '0.875rem',
              color: 'var(--ica-muted)',
            }}
          >
            <strong style={{ color: 'var(--ica-ink)' }}>Bug reports:</strong> include browser, OS, clip length, and
            whether you used upload or microphone recording.
          </div>
        </div>
      </div>
    </div>
  )
}
