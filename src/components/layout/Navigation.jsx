import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { CircleUserRound, EllipsisVertical } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/workouts', label: 'Workouts' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/nutrition', label: 'Nutrition' },
]

// Width reserved for the menu button at the right end of the nav.
const MENU_BUTTON_WIDTH = 44
// Matches the ul's gap-1.
const ITEM_GAP = 4

const menuLinkClass = (isActive) =>
  cn(
    "block w-full text-left px-4 py-2 text-sm font-medium transition-colors",
    isActive
      ? "text-foreground bg-muted"
      : "text-muted-foreground hover:text-foreground hover:bg-muted"
  )

export default function Navigation() {
  const { user, signOut } = useAuth()
  const [visibleCount, setVisibleCount] = useState(navItems.length)
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef(null)
  const itemsRef = useRef([])
  const location = useLocation()

  // Close the menu on route change by adjusting state during render when the
  // path changes — React's recommended alternative to a reset-on-change effect.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  // Fit as many tabs as possible, leaving room for the menu button.
  useEffect(() => {
    const calculateVisibleItems = () => {
      if (!containerRef.current) return

      const available = containerRef.current.offsetWidth - MENU_BUTTON_WIDTH
      let totalWidth = 0
      let count = 0

      for (const item of itemsRef.current) {
        if (!item) continue
        const needed = totalWidth + (count > 0 ? ITEM_GAP : 0) + item.offsetWidth
        if (needed > available) break
        totalWidth = needed
        count++
      }

      setVisibleCount(count || 1) // Always show at least 1
    }

    calculateVisibleItems()
    window.addEventListener('resize', calculateVisibleItems)
    return () => window.removeEventListener('resize', calculateVisibleItems)
  }, [])

  const visibleItems = navItems.slice(0, visibleCount)
  const overflowItems = navItems.slice(visibleCount)
  // With tabs overflowing, one "more" menu holds both the extra tabs and the
  // account options. Otherwise the button is just the account menu.
  const MenuIcon = overflowItems.length > 0 ? EllipsisVertical : CircleUserRound

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
  }

  return (
    <nav className="border-b bg-background relative">
      <div className="max-w-6xl mx-auto px-4">
        <div ref={containerRef} className="flex items-center">
          <ul className="flex gap-1">
            {visibleItems.map((item) => (
              <li key={item.to}>
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

          {/* Hidden copies of every tab, measured to decide how many fit */}
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

          {(user || overflowItems.length > 0) && (
            <div className="relative ml-auto">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={cn(
                  "p-2.5 transition-colors",
                  menuOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={overflowItems.length > 0 ? "More options" : "Account menu"}
                aria-expanded={menuOpen}
              >
                <MenuIcon className="w-6 h-6" strokeWidth={1.75} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-50 min-w-48">
                  {overflowItems.length > 0 && (
                    <ul className={cn("py-1", user && "border-b")}>
                      {overflowItems.map((item) => (
                        <li key={item.to}>
                          <NavLink
                            to={item.to}
                            onClick={() => setMenuOpen(false)}
                            className={({ isActive }) => menuLinkClass(isActive)}
                          >
                            {item.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                  {user && (
                    <>
                      <div className="px-4 py-3 border-b">
                        <p className="text-sm font-medium truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/settings"
                          onClick={() => setMenuOpen(false)}
                          className={menuLinkClass(location.pathname === '/settings')}
                        >
                          Settings
                        </Link>
                        <button onClick={handleSignOut} className={menuLinkClass(false)}>
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
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
