import { createContext, useContext, useEffect, useState } from 'react'
import { getMe, loginUser, logoutUser, registerUser } from '../services/auth.js'

const AuthContext = createContext(null)

// Holds the signed-in user and exposes auth actions to the whole app.
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

  // Signs in through the API and stores the returned user in context.
  async function login(credentials) {
    const data = await loginUser(credentials)
    setUser(data.data.user)
    return data.data.user
  }

  // Creates an account; the server also starts the session cookie.
  async function register(formData) {
    const data = await registerUser(formData)
    setUser(data.data.user)
    return data.data.user
  }

  // Clears the server cookie first, then forgets the local user.
  async function logout() {
    await logoutUser()
    setUser(null)
  }

  // Replaces the cached user after a profile update elsewhere in the app.
  function updateUser(updatedUser) {
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Reads the auth context; throws early when used outside the provider.
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return context
}
