import { FlaskConical, Database, ShieldAlert, Baby } from 'lucide-react'

const aboutCards = [
  {
    title: 'Project overview',
    body: 'Infant Cry Analyzer is a web-based assistant designed to present infant cry analysis in a calm, parent-friendly interface suitable for demos, portfolios, and final year presentations.',
    Icon: Baby,
  },
  {
    title: 'Kaggle-trained ML workflow',
    body: 'The prediction pipeline uses existing machine learning models trained from an infant cry dataset workflow prepared in Kaggle and connected to this application through Flask.',
    Icon: Database,
  },
  {
    title: 'Flask backend integration',
    body: 'Audio is uploaded from the frontend, processed by the existing Flask backend, and returned as structured prediction data used to power the result interface.',
    Icon: FlaskConical,
  },
  {
    title: 'Disclaimer',
    body: 'This tool assists parents and is not a replacement for medical advice. It is intended only for infants below one year old.',
    Icon: ShieldAlert,
  },
]

export function AboutScreen() {
  return (
    <div className="ica-page-stack">
      <section className="ica-page-hero">
        <div>
          <span className="ica-kicker">About the project</span>
          <h1 className="ica-section-title">About</h1>
          <p className="ica-lead">
            A Flask-based infant healthcare style application designed around existing ML models and a more professional
            user experience.
          </p>
        </div>
      </section>

      <section className="ica-about-grid">
        {aboutCards.map(({ title, body, Icon }) => (
          <article key={title} className="ica-about-card">
            <div className="ica-panel-icon">
              <Icon size={20} aria-hidden />
            </div>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
