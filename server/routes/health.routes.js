import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

router.get('/', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1

  res.status(200).json({
    success: true,
    message: 'TaskFlow API is running',
    data: {
      db: isConnected ? 'connected' : 'disconnected',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  })
})

export default router
