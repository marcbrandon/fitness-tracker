import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signIn') // 'signIn', 'signUp', 'forgotPassword'
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (mode === 'forgotPassword') {
      const { error } = await resetPassword(email)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for a password reset link')
      }
      setLoading(false)
      return
    }

    const { error } = mode === 'signUp'
      ? await signUp(email, password)
      : await signIn(email, password)

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {mode === 'signUp' ? 'Create Account' : mode === 'forgotPassword' ? 'Reset Password' : 'Sign In'}
          </CardTitle>
          <CardDescription>
            {mode === 'signUp'
              ? 'Enter your email to create an account'
              : mode === 'forgotPassword'
              ? 'Enter your email to receive a reset link'
              : 'Enter your credentials to access your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {mode !== 'forgotPassword' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {message && (
              <p className="text-sm text-green-600">{message}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? 'Loading...'
                : mode === 'signUp'
                ? 'Sign Up'
                : mode === 'forgotPassword'
                ? 'Send Reset Link'
                : 'Sign In'}
            </Button>
          </form>

          {mode === 'signIn' && (
            <p className="mt-2 text-center text-sm">
              <button
                onClick={() => { setMode('forgotPassword'); setError(null); setMessage(null); }}
                className="text-muted-foreground hover:text-primary hover:underline"
              >
                Forgot password?
              </button>
            </p>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'signUp' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setMode(mode === 'signUp' ? 'signIn' : 'signUp'); setError(null); setMessage(null); }}
              className="text-primary hover:underline"
            >
              {mode === 'signUp' ? 'Sign In' : 'Sign Up'}
            </button>
          </p>

          {mode === 'forgotPassword' && (
            <p className="mt-2 text-center text-sm">
              <button
                onClick={() => { setMode('signIn'); setError(null); setMessage(null); }}
                className="text-muted-foreground hover:text-primary hover:underline"
              >
                Back to sign in
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
