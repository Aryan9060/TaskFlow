// Runs a Zod schema against req.body. Replaces the body with the parsed
// (and trimmed/lowercased) data, or returns 400 with readable messages.
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(' ')
      return res.status(400).json({ success: false, message })
    }

    req.body = result.data
    next()
  }
}
