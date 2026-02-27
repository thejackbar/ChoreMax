import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const checkAuth = useCallback(async () => {
    try {
      const u = await api.auth.me()
      setUser(u)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
    const handler = () => {
      setUser(null)
      setLoading(false)
    }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [checkAuth])

  const login = async (data) => {
    setError(null)
    try {
      const u = await api.auth.login(data)
      setUser(u)
      return u
    } catch (e) {
      setError(e.message)
      throw e
    }
  }

  const register = async (data) => {
    setError(null)
    try {
      const u = await api.auth.register(data)
      setUser(u)
      return u
    } catch (e) {
      setError(e.message)
      throw e
    }
  }

  const logout = async () => {
    await api.auth.logout()
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const u = await api.auth.me()
      setUser(u)
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, refreshUser, setError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
