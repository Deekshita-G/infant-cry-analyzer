import { Outlet, Link } from 'react-router-dom'
import { NavBar } from './NavBar'
import { Heart } from 'lucide-react'

export function Layout() {
  return (
    <div className="ica-shell">
      <NavBar />
      <div className="ica-main animate-in">
        <Outlet />
      </div>
      <footer className="ica-footer">
        <div className="ica-footer-inner">
          <div>
            <h3 className="ica-footer-brand">
              <Heart size={18} className="inline" fill="currentColor" aria-hidden />
              Infant Cry Analyzer
            </h3>
            <p>
              A parent-friendly healthcare style web app for reviewing infant cry audio and receiving supportive next
              steps for babies under one year.
            </p>
          </div>
          <div>
            <h3>Quick links</h3>
            <ul className="ica-footer-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/analyze">Analyze Cry</Link>
              </li>
              <li>
                <Link to="/history">History</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Important note</h3>
            <p>
              This tool assists parents and is not a replacement for medical advice. If breathing, feeding, or
              responsiveness feels concerning, seek urgent care.
            </p>
          </div>
        </div>
        <div className="ica-footer-bottom">
          © {new Date().getFullYear()} Infant Cry Analyzer - Flask backend with existing Kaggle-trained ML models.
        </div>
      </footer>
    </div>
  )
}

