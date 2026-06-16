import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { getDB } from '../db.js'

export const roomsWithClients: Map<string, Set<unknown>> = new Map()

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'syncboard-dev-secret-key-change-in-prod'

const TOKEN_EXPIRE_MS = 24 * 60 * 60 * 1000

const router = Router()

function sign(data: string): string {
  return crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex')
}

function generateToken(roomId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2)
  const payload = `${roomId}:${timestamp}:${random}`
  const signature = sign(payload)
  const raw = `${payload}.${signature}`
  return Buffer.from(raw).toString('base64')
}

export function verifyToken(token: string, roomId: string): boolean {
  try {
    const raw = Buffer.from(token, 'base64').toString()
    const lastDot = raw.lastIndexOf('.')
    if (lastDot === -1) return false
    const payload = raw.slice(0, lastDot)
    const signature = raw.slice(lastDot + 1)
    const expectedSignature = sign(payload)
    if (signature !== expectedSignature) return false
    const parts = payload.split(':')
    if (parts.length < 2) return false
    const tokenRoomId = parts[0]
    const timestamp = parseInt(parts[1], 10)
    if (tokenRoomId !== roomId) return false
    if (Date.now() - timestamp > TOKEN_EXPIRE_MS) return false
    return true
  } catch {
    return false
  }
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, password } = req.body

  if (!name || typeof name !== 'string') {
    res.status(400).json({ success: false, error: 'Room name is required' })
    return
  }

  const roomId = uuidv4()
  const passwordHash = password ? await bcrypt.hash(password, 10) : null

  const db = getDB()
  db.run(
    'INSERT INTO rooms (id, name, password_hash) VALUES (?, ?, ?)',
    [roomId, name, passwordHash]
  )

  roomsWithClients.set(roomId, new Set())

  res.status(201).json({
    success: true,
    data: {
      roomId,
      name,
      hasPassword: !!password,
    },
  })
})

router.get('/', (_req: Request, res: Response): void => {
  const db = getDB()
  const result = db.exec('SELECT id, name, password_hash FROM rooms ORDER BY created_at DESC')

  const rooms = result[0]?.values.map((row) => ({
    roomId: row[0] as string,
    name: row[1] as string,
    hasPassword: !!row[2],
    userCount: roomsWithClients.get(row[0] as string)?.size ?? 0,
  })) ?? []

  res.json({ success: true, data: rooms })
})

router.post('/:roomId/verify', async (req: Request, res: Response): Promise<void> => {
  const { roomId } = req.params
  const { password } = req.body

  const db = getDB()
  const result = db.exec('SELECT id, name, password_hash FROM rooms WHERE id = ?', [roomId])

  if (!result[0]?.values.length) {
    res.status(404).json({ success: false, error: 'Room not found' })
    return
  }

  const roomName = result[0].values[0][1] as string
  const passwordHash = result[0].values[0][2] as string | null

  if (!passwordHash) {
    const token = generateToken(roomId)
    res.json({ success: true, data: { valid: true, token, roomName } })
    return
  }

  if (!password) {
    res.status(400).json({ success: false, error: 'Password is required' })
    return
  }

  const valid = await bcrypt.compare(password, passwordHash)
  if (!valid) {
    res.json({ success: true, data: { valid: false } })
    return
  }

  const token = generateToken(roomId)
  res.json({ success: true, data: { valid: true, token, roomName } })
})

router.post('/:roomId/reverify', async (req: Request, res: Response): Promise<void> => {
  const { roomId } = req.params
  const { password } = req.body
  const { existingToken } = req.body

  if (existingToken && verifyToken(existingToken, roomId)) {
    const db = getDB()
    const result = db.exec('SELECT name FROM rooms WHERE id = ?', [roomId])
    const roomName = result[0]?.values[0]?.[0] as string | undefined
    res.json({ success: true, data: { valid: true, token: existingToken, roomName } })
    return
  }

  const db = getDB()
  const result = db.exec('SELECT id, name, password_hash FROM rooms WHERE id = ?', [roomId])

  if (!result[0]?.values.length) {
    res.status(404).json({ success: false, error: 'Room not found' })
    return
  }

  const roomName = result[0].values[0][1] as string
  const passwordHash = result[0].values[0][2] as string | null

  if (!passwordHash) {
    const token = generateToken(roomId)
    res.json({ success: true, data: { valid: true, token, roomName } })
    return
  }

  if (!password) {
    res.status(400).json({ success: false, error: 'Password is required' })
    return
  }

  const valid = await bcrypt.compare(password, passwordHash)
  if (!valid) {
    res.json({ success: true, data: { valid: false } })
    return
  }

  const token = generateToken(roomId)
  res.json({ success: true, data: { valid: true, token, roomName } })
})

export function getRoomPasswordHash(roomId: string): string | null {
  const db = getDB()
  const result = db.exec('SELECT password_hash FROM rooms WHERE id = ?', [roomId])
  if (!result[0]?.values.length) return undefined as unknown as null
  return result[0].values[0][0] as string | null
}

export function getRoomName(roomId: string): string | null {
  const db = getDB()
  const result = db.exec('SELECT name FROM rooms WHERE id = ?', [roomId])
  if (!result[0]?.values.length) return null
  return result[0].values[0][0] as string
}

export default router
