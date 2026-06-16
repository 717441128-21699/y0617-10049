import * as Y from 'yjs'
import { v4 as uuidv4 } from 'uuid'
import { getDB } from './db.js'
import { getRooms } from './ws-handler.js'

const SAVE_INTERVAL = 60_000
const saveTimers = new Map<string, ReturnType<typeof setInterval>>()

export function loadSnapshot(roomId: string, ydoc: Y.Doc): void {
  const db = getDB()
  const result = db.exec(
    'SELECT data FROM snapshots WHERE room_id = ? ORDER BY created_at DESC LIMIT 1',
    [roomId]
  )

  if (result[0]?.values.length) {
    const data = result[0].values[0][0] as Uint8Array
    if (data && data.length > 0) {
      Y.applyUpdate(ydoc, data)
    }
  }

  startPeriodicSave(roomId, ydoc)
}

export function saveSnapshot(roomId: string, ydoc: Y.Doc): void {
  const db = getDB()
  const data = Y.encodeStateAsUpdate(ydoc)
  const snapshotId = uuidv4()

  db.run(
    'INSERT INTO snapshots (id, room_id, data) VALUES (?, ?, ?)',
    [snapshotId, roomId, Buffer.from(data)]
  )
}

export function startPeriodicSave(roomId: string, ydoc: Y.Doc): void {
  if (saveTimers.has(roomId)) return

  const timer = setInterval(() => {
    saveSnapshot(roomId, ydoc)
  }, SAVE_INTERVAL)

  saveTimers.set(roomId, timer)
}

export function stopPeriodicSave(roomId: string): void {
  const timer = saveTimers.get(roomId)
  if (timer) {
    clearInterval(timer)
    saveTimers.delete(roomId)
  }
}

export function stopAllPeriodicSaves(): void {
  const rooms = getRooms()
  for (const [roomId, room] of rooms) {
    saveSnapshot(roomId, room.ydoc)
    stopPeriodicSave(roomId)
  }
}
