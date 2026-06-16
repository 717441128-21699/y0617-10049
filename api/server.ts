import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import app from './app.js'
import { initDB, stopDBSave } from './db.js'
import { setupWebSocket } from './ws-handler.js'
import { stopAllPeriodicSaves } from './persistence.js'

const PORT = process.env.PORT || 3001

async function start() {
  await initDB()

  const server = createServer(app)

  const wss = new WebSocketServer({ server })
  setupWebSocket(wss)

  server.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}`)
  })

  const gracefulShutdown = () => {
    console.log('Shutting down gracefully...')
    stopAllPeriodicSaves()
    stopDBSave()

    wss.clients.forEach((client) => {
      client.close(1001, 'Server shutting down')
    })

    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })

    setTimeout(() => {
      console.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10_000)
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
