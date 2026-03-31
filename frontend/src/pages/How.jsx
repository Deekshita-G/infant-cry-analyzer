const steps = [
  {
    n: 1,
    title: 'Capture audio',
    body: 'Upload a file or record a few seconds when your baby is crying—ideally in a quieter room.',
    color: '#ccfbf1',
    border: '#0d9488',
  },
  {
    n: 2,
    title: 'Sound classification',
    body: 'The server estimates baby cry vs. adult speech, background noise, unclear audio, or no cry.',
    color: '#e0e7ff',
    border: '#4f46e5',
  },
  {
    n: 3,
    title: 'Risk screening',
    body: 'If a cry is detected, the existing random forest model scores asphyxia-related risk using your shipped thresholds.',
    color: '#fef3c7',
    border: '#d97706',
  },
  {
    n: 4,
    title: 'Care hints',
    body: 'When risk is below threshold, you may see tentative everyday causes (heuristics) plus parent-focused steps.',
    color: '#fce7f3',
    border: '#db2777',
  },
]

export function How() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <span className="ica-kicker">Pipeline</span>
      <h1 className="ica-section-title">How it works</h1>
      <p className="ica-lead">Four clear stages—from your recording to on-screen guidance.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {steps.map((s) => (
          <div
            key={s.n}
            className="ica-card"
            style={{
              borderLeft: `6px solid ${s.border}`,
              background: `linear-gradient(90deg, ${s.color}33, #fff)`,
            }}
          >
            <div className="ica-card-pad" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: s.color,
                  border: `2px solid ${s.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  color: '#0f172a',
                  flexShrink: 0,
                }}
              >
                {s.n}
              </div>
              <div>
                <h2 className="ica-font-display" style={{ margin: '0 0 0.35rem', fontSize: '1.2rem' }}>
                  {s.title}
                </h2>
                <p style={{ margin: 0, color: 'var(--ica-muted)', lineHeight: 1.55 }}>{s.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.95rem', color: 'var(--ica-muted)' }}>
        Low confidence means you should take suggestions lightly and rely on in-person care when unsure.
      </p>
    </div>
  )
}
