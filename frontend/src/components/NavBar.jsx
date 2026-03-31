import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Home, Mic, History, Info, ClipboardList, Baby, Menu, X } from 'lucide-react'

const links = [
  { to: '/', label: 'Home', end: true, Icon: Home },
  { to: '/analyze', label: 'Analyze Cry', end: false, Icon: Mic },
  { to: '/history', label: 'History', end: false, Icon: History },
  { to: '/about', label: 'About', end: false, Icon: Info },
  { to: '/result', label: 'Results', end: false, Icon: ClipboardList },
]

export function NavBar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="ica-header">
      <div className="ica-header-inner">
        <NavLink to="/" className="ica-brand" onClick={() => setOpen(false)}>
          <span className="ica-brand-badge" aria-hidden>
            <Baby size={26} strokeWidth={2.2} />
          </span>
          <span>
            <div className="ica-brand-title">Infant Cry Analyzer</div>
            <div className="ica-brand-sub">Gentle infant cry guidance</div>
          </span>
        </NavLink>

        <nav className="ica-nav-desktop" aria-label="Main navigation">
          {links.map(({ to, label, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                ['ica-nav-link', isActive ? 'ica-nav-link--active' : ''].filter(Boolean).join(' ')
              }
            >
              <Icon size={18} strokeWidth={2.25} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="ica-menu-btn"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="ica-nav-mobile" aria-label="Mobile navigation">
          {links.map(({ to, label, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                ['ica-nav-link', isActive ? 'ica-nav-link--active' : ''].filter(Boolean).join(' ')
              }
            >
              <Icon size={18} strokeWidth={2.25} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}

