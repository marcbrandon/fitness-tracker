import { Link } from 'react-router-dom'
import Header from './Header'
import Navigation from './Navigation'

const APP_VERSION = 'v0.5.9'

export default function Layout({ children }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col">
      <Header />
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        {children}
      </main>
      <footer className="border-t bg-background">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{today}</span>
            <span>{APP_VERSION}</span>
          </div>
          <Link to="/import" className="hover:text-foreground transition-colors">
            Import data
          </Link>
        </div>
      </footer>
    </div>
  )
}
