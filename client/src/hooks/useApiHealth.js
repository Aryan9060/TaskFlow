import { useEffect, useState } from 'react'
import { getHealth } from '../services/api.js'

export function useApiHealth() {
  const [status, setStatus] = useState({ loading: true, online: false, db: 'unknown' })

  useEffect(() => {
    let cancelled = false

    getHealth()
      .then((data) => {
        if (!cancelled) {
          setStatus({ loading: false, online: true, db: data.data.db })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({ loading: false, online: false, db: 'unreachable' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return status
}
