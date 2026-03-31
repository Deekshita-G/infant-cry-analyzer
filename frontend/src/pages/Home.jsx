import { Link } from 'react-router-dom'
import { Mic, Shield, Sparkles, ArrowRight, HeartHandshake } from 'lucide-react'

export function Home() {
  return (
    <div>
      <section className="ica-hero">
        <div>
          <span className="ica-kicker">Machine learning · Parent-friendly</span>
          <h1 className="ica-section-title" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
            Calm, clear help when your baby cries
          </h1>
          <p className="ica-lead">
            Upload a short recording or use your microphone. We help tell <strong style={{ color: 'var(--ica-ink)' }}>baby cry</strong>{' '}
            from other sounds, then, when it is a cry, share honest confidence-aware guidance. Always pair this with your
            own judgment and your care team.
          </p>
          <div className="ica-hero-actions">
            <Link to="/analyze" className="ica-btn ica-btn--primary">
              <Mic size={20} aria-hidden />
              Start analysis
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link to="/how" className="ica-btn ica-btn--secondary">
              How it works
            </Link>
          </div>
        </div>
        <div className="ica-hero-visual">
          <img
            src="/illustrations/hero-family.svg"
            alt="Soft illustration of a caregiver and baby in a calm scene"
            width={420}
            height={280}
          />
        </div>
      </section>

      <div className="ica-features">
        <div className="ica-feature">
          <div className="ica-feature-icon" style={{ background: 'linear-gradient(135deg,#dff4f0,#bfe6dd)' }}>
            <Mic size={22} color="#2b6f73" aria-hidden />
          </div>
          <h3>Upload or record</h3>
          <p>Clear step-by-step capture with a calmer review flow and instant waveform preview.</p>
        </div>
        <div className="ica-feature">
          <div className="ica-feature-icon" style={{ background: 'linear-gradient(135deg,#eef2fb,#dbe8f7)' }}>
            <Sparkles size={22} color="#577ea6" aria-hidden />
          </div>
          <h3>Structured results</h3>
          <p>Readable cause, confidence, and care guidance are grouped into one parent-friendly result screen.</p>
        </div>
        <div className="ica-feature">
          <div className="ica-feature-icon" style={{ background: 'linear-gradient(135deg,#fbe7eb,#f6d9df)' }}>
            <Shield size={22} color="#b25a68" aria-hidden />
          </div>
          <h3>Safety first</h3>
          <p>Assistive only. Emergency guidance and clear limitations stay visible when parents need reassurance.</p>
        </div>
      </div>
    </div>
  )
}

