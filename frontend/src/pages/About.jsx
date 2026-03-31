import { Users, FlaskConical, HeartPulse } from 'lucide-react'

export function About() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <span className="ica-kicker">Our mission</span>
      <h1 className="ica-section-title">About this app</h1>

      <div className="ica-card" style={{ marginTop: '1.5rem' }}>
        <div className="ica-card-pad">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="ica-feature-icon" style={{ background: 'linear-gradient(135deg,#ccfbf1,#99f6e4)', marginBottom: 0 }}>
              <Users size={22} color="#0f766e" aria-hidden />
            </div>
            <div>
              <h2 className="ica-font-display" style={{ margin: '0 0 0.35rem', fontSize: '1.25rem' }}>
                For infants under one year
              </h2>
              <p style={{ margin: 0, color: 'var(--ica-muted)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--ica-ink)' }}>Infant Cry Analyzer</strong> is aimed at parents and
                caregivers of babies <strong style={{ color: 'var(--ica-ink)' }}>under 12 months</strong>. Older infants
                and children may need different clinical context.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="ica-feature-icon" style={{ background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', marginBottom: 0 }}>
              <FlaskConical size={22} color="#5b21b6" aria-hidden />
            </div>
            <div>
              <h2 className="ica-font-display" style={{ margin: '0 0 0.35rem', fontSize: '1.25rem' }}>
                Models from research workflows
              </h2>
              <p style={{ margin: 0, color: 'var(--ica-muted)', lineHeight: 1.6 }}>
                Machine learning models were trained on <strong style={{ color: 'var(--ica-ink)' }}>infant cry datasets</strong>{' '}
                and refined in <strong style={{ color: 'var(--ica-ink)' }}>Kaggle-style notebooks</strong>, then
                integrated with a production Flask API.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="ica-feature-icon" style={{ background: 'linear-gradient(135deg,#fee2e2,#fecaca)', marginBottom: 0 }}>
              <HeartPulse size={22} color="#b91c1c" aria-hidden />
            </div>
            <div>
              <h2 className="ica-font-display" style={{ margin: '0 0 0.35rem', fontSize: '1.25rem' }}>
                Assistive—not authoritative
              </h2>
              <p style={{ margin: 0, color: 'var(--ica-muted)', lineHeight: 1.6 }}>
                We want to reduce parent anxiety with <em>clear language and honest limits</em>. Nothing here replaces
                your pediatrician, nurse line, or emergency services.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
