import mongoSanitize from 'express-mongo-sanitize'

/**
 * Removes MongoDB operator keys ($-prefixed or dotted) from the JSON body
 * before any controller reads it. We call the library's sanitize() directly
 * instead of its middleware, because the middleware reassigns req.query and
 * req.params, which are getter-only in Express 5 and would throw.
 */
export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    mongoSanitize.sanitize(req.body, { replaceWith: '_' })
  }
  next()
}
