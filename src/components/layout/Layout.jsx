import Header from './Header'
import Navigation from './Navigation'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
