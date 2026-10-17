import { createContext, useContext, useEffect, useState } from 'react'
import { getMe, loginUser, logoutUser, registerUser } from '../services/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On first load, ask the server if we already have a valid session cookie
  useEffect(() => {
    getMe()
      .then((data) => setUser(data.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(credentials) {
    const data = await loginUser(credentials)
    setUser(data.data.user)
    return data.data.user
  }

  async function register(formData) {
    const data = await registerUser(formData)
    setUser(data.data.user)
    return data.data.user
  }

  async function logout() {
    await logoutUser()
    setUser(null)
  }

  function updateUser(updatedUser) {
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return context
}
