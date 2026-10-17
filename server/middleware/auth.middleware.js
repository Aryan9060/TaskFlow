import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Reads the JWT from the HTTP-only cookie, loads the user, attaches req.user.
// Any failure short-circuits with 401 so private routes never run.
export async function protect(req, res, next) {
  try {
    const token = req.cookies.taskflow_token

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)

    if (!user) {
      return res.status(401).json({ success: false, message: 'This account no longer exists.' })
    }

    req.user = user
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Your session is invalid or expired. Please log in again.' })
  }
}
