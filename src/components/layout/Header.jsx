import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Header() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
  }

  return (
    <header className="border-b bg-background">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Fitness Tracker</h1>
        {user && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "p-2 rounded transition-colors",
                menuOpen ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Account menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-background border rounded-md shadow-lg z-50 min-w-48">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="w-full justify-start rounded-none px-4"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </header>
  )
}
