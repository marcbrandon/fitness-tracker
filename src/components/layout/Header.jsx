import { useAuth } from '../../hooks/useAuth'

export default function Header() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Fitness Tracker</h1>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
