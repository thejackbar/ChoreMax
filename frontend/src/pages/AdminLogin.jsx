import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.admin.verify()
      .then(() => navigate('/admin/site', { replace: true }))
      .catch(() => setLoading(false))
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await api.admin.login({ email, password })
      navigate('/admin/site')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="flex-center" style={{ minHeight: '100vh' }}>Loading...</div>

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <span className="land-logo-icon">&#x2728;</span>
          <h1>ChoreMax Admin</h1>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="admin-login-error">{error}</div>}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
            Log In
          </button>
        </form>
      </div>
    </div>
  )
}
