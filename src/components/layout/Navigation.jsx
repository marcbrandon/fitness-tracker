import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/workouts', label: 'Workouts' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/nutrition', label: 'Nutrition' },
]

export default function Navigation() {
  const [visibleCount, setVisibleCount] = useState(navItems.length)
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef(null)
  const itemsRef = useRef([])
  const moreButtonRef = useRef(null)
  const location = useLocation()

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  // Calculate how many items fit
  useEffect(() => {
    const calculateVisibleItems = () => {
      if (!containerRef.current) return

      const containerWidth = containerRef.current.offsetWidth
      const moreButtonWidth = 60 // Approximate width for "more" button
      let totalWidth = 0
      let count = 0

      for (let i = 0; i < itemsRef.current.length; i++) {
        const item = itemsRef.current[i]
        if (!item) continue

        const itemWidth = item.offsetWidth
        const neededSpace = totalWidth + itemWidth + (i < navItems.length - 1 ? moreButtonWidth : 0)

        if (neededSpace <= containerWidth) {
          totalWidth += itemWidth
          count++
        } else {
          break
        }
      }

      setVisibleCount(count || 1) // Always show at least 1
    }

    calculateVisibleItems()
    window.addEventListener('resize', calculateVisibleItems)
    return () => window.removeEventListener('resize', calculateVisibleItems)
  }, [])

  const visibleItems = navItems.slice(0, visibleCount)
  const overflowItems = navItems.slice(visibleCount)

  return (
    <nav className="border-b bg-background relative">
      <div className="max-w-6xl mx-auto px-4">
        <div ref={containerRef} className="flex items-center">
          <ul className="flex gap-1">
            {visibleItems.map((item, index) => (
              <li key={item.to} ref={(el) => (itemsRef.current[index] = el)}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "block px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
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

          {/* Hidden items for measurement */}
          <div className="absolute invisible" aria-hidden="true">
            <ul className="flex gap-1">
              {navItems.map((item, index) => (
                <li key={item.to} ref={(el) => (itemsRef.current[index] = el)}>
                  <span className="block px-4 py-3 text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Overflow menu button */}
          {overflowItems.length > 0 && (
            <div className="relative ml-auto" ref={moreButtonRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={cn(
                  "p-3 text-sm font-medium transition-colors",
                  menuOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="More navigation options"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-50 min-w-40">
                  <ul className="py-1">
                    {overflowItems.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          onClick={() => setMenuOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              "block px-4 py-2 text-sm font-medium transition-colors",
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
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </nav>
  )
}
