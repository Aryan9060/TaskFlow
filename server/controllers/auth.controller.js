import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const COOKIE_NAME = 'taskflow_token'
const TOKEN_DAYS = 7

function buildToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: `${TOKEN_DAYS}d` })
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // JavaScript cannot read this cookie — XSS cannot steal it
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // browser withholds the cookie on cross-site POSTs (CSRF mitigation)
    maxAge: TOKEN_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export async function register(req, res) {
  const { name, email, password } = req.body

  const existing = await User.findOne({ email })
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, passwordHash })

  const token = buildToken(user._id)
  setAuthCookie(res, token)

  res.status(201).json({ success: true, message: 'Account created successfully.', data: { user: user.toSafeObject() } })
}

export async function login(req, res) {
  const { email, password } = req.body

  const user = await User.findOne({ email }).select('+passwordHash')
  const passwordMatches = user && (await bcrypt.compare(password, user.passwordHash))

  if (!passwordMatches) {
    // Same message for "no such user" and "wrong password" — never reveal which one failed
    return res.status(401).json({ success: false, message: 'Invalid email or password.' })
  }

  const token = buildToken(user._id)
  setAuthCookie(res, token)

  res.status(200).json({ success: true, message: 'Logged in successfully.', data: { user: user.toSafeObject() } })
}

export async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.status(200).json({ success: true, message: 'Logged out successfully.' })
}

export async function getMe(req, res) {
  res.status(200).json({ success: true, data: { user: req.user.toSafeObject() } })
}

export async function updateProfile(req, res) {
  const { name, preferences } = req.body

  if (name !== undefined) req.user.name = name
  if (preferences?.pomodoroFocusMinutes !== undefined) {
    req.user.preferences.pomodoroFocusMinutes = preferences.pomodoroFocusMinutes
  }
  if (preferences?.pomodoroBreakMinutes !== undefined) {
    req.user.preferences.pomodoroBreakMinutes = preferences.pomodoroBreakMinutes
  }
  if (preferences?.weeklyGoalMinutes !== undefined) {
    req.user.preferences.weeklyGoalMinutes = preferences.weeklyGoalMinutes
  }

  await req.user.save()

  res.status(200).json({ success: true, message: 'Profile updated.', data: { user: req.user.toSafeObject() } })
}
