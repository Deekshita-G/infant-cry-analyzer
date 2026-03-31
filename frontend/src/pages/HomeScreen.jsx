import { Link } from 'react-router-dom'
import { ArrowRight, HeartHandshake, Mic, Shield, Sparkles } from 'lucide-react'

const highlights = [
  {
    title: 'Waveform-guided review',
    body: 'Preview uploaded or recorded audio before analysis so parents can confirm they selected the right clip.',
    Icon: Mic,
  },
  {
    title: 'Clear result summaries',
    body: 'Understand likely cause, confidence level, and what to do next in a calm, structured screen.',
    Icon: Sparkles,
  },
  {
    title: 'Trustworthy presentation',
    body: 'Soft colors, warm spacing, and visible safety guidance make the experience feel reassuring and professional.',
    Icon: HeartHandshake,
  },
]

export function HomeScreen() {
  return (
    <div className="ica-page-stack">
      <section className="ica-home-hero">
        <div className="ica-home-copy">
          <span className="ica-kicker">Parent-friendly healthcare interface</span>
          <h1 className="ica-section-title ica-home-title">Infant Cry Analyzer</h1>
          <p className="ica-lead">Understanding your baby's cries with gentle guidance</p>
          <p className="ica-home-note">Only for infants below 1 year</p>
          <p className="ica-home-support">
            This application helps caregivers identify possible reasons behind an infant's cry
          </p>

          <div className="ica-hero-actions">
            <Link to="/analyze" className="ica-btn ica-btn--primary">
              <Mic size={20} aria-hidden />
              Analyze Cry
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link to="/about" className="ica-btn ica-btn--secondary">
              <Shield size={18} aria-hidden />
              About the project
            </Link>
          </div>
        </div>

        <div className="ica-home-visual">
          <div className="ica-home-image-card">
            <img
              src="https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80"
              alt="Cute Baby"
              className="rounded-2xl object-cover w-full h-full"
            />
          </div>
        </div>
      </section>

      <section className="ica-highlight-grid" aria-label="Core application highlights">
        {highlights.map(({ title, body, Icon }) => (
          <article key={title} className="ica-highlight-card">
            <div className="ica-highlight-icon">
              <Icon size={20} aria-hidden />
            </div>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
