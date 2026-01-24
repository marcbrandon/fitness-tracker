import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/workouts', label: 'Workouts' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/nutrition', label: 'Nutrition' },
]

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="border-b bg-background">
      <div className="max-w-6xl mx-auto px-4">
        {/* Desktop nav */}
        <ul className="hidden sm:flex gap-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "block px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger button */}
        <div className="sm:hidden flex items-center py-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t bg-background">
          <ul className="max-w-6xl mx-auto px-4 py-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "block px-4 py-3 text-sm font-medium transition-colors rounded",
                      isActive
                        ? "text-foreground bg-muted"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  )
}
