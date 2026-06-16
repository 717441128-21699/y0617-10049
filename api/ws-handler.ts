import { WebSocketServer, type WebSocket } from 'ws'
import * as Y from 'yjs'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { roomsWithClients, verifyToken } from './routes/rooms.js'
import { loadSnapshot, saveSnapshot } from './persistence.js'

const USER_COLORS = [
  '#00e5a0', '#ff6b6b', '#4ecdc4', '#ffe66d',
  '#a29bfe', '#fd79a8', '#00cec9', '#fab1a0',
]

interface RoomState {
  ydoc: Y.Doc
  clients: Map<WebSocket, ClientInfo>
  colorIndex: number
}

interface ClientInfo {
  roomId: string
  userId: string
  userName: string
  color: string
}

const rooms = new Map<string, RoomState>()

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket) => {
    let joined = false

    const onMessage = (data: Buffer) => {
      if (joined) {
        handleMessage(ws, data)
        return
      }

      try {
        const decoder = decoding.createDecoder(new Uint8Array(data))
        const msgType = decoding.readVarUint(decoder)

        if (msgType === 4) {
          const joinPayload = decoding.readVarUint8Array(decoder)
          const joinMsg = JSON.parse(new TextDecoder().decode(joinPayload))
          const { roomId, token, userName, userId } = joinMsg

          if (!roomId) {
            ws.close(4001, 'roomId is required')
            return
          }

          if (!token || !verifyToken(token, roomId)) {
            ws.close(4003, 'Invalid or missing token')
            return
          }

          let room = rooms.get(roomId)
          if (!room) {
            room = createRoom(roomId)
          }

          const color = USER_COLORS[room.colorIndex % USER_COLORS.length]
          room.colorIndex++

          const clientInfo: ClientInfo = { roomId, userId: userId || `anon-${Date.now()}`, userName: userName || 'Anonymous', color }
          room.clients.set(ws, clientInfo)

          if (!roomsWithClients.has(roomId)) {
            roomsWithClients.set(roomId, new Set())
          }
          roomsWithClients.get(roomId)!.add(clientInfo.userId)

          const existingUsers = Array.from(room.clients.values()).map((c) => ({
            id: c.userId,
            name: c.userName,
            color: c.color,
          }))

          const welcomePayload = new TextEncoder().encode(JSON.stringify({ users: existingUsers }))
          const welcomeEncoder = encoding.createEncoder()
          encoding.writeVarUint(welcomeEncoder, 5)
          encoding.writeVarUint8Array(welcomeEncoder, welcomePayload)
          ws.send(encoding.toUint8Array(welcomeEncoder))

          const joinBroadcastPayload = new TextEncoder().encode(
            JSON.stringify({ user: { id: clientInfo.userId, name: clientInfo.userName, color: clientInfo.color } }),
          )
          const joinEncoder = encoding.createEncoder()
          encoding.writeVarUint(joinEncoder, 6)
          encoding.writeVarUint8Array(joinEncoder, joinBroadcastPayload)
          broadcastToRoom(roomId, encoding.toUint8Array(joinEncoder), ws)

          const clientStateVector = decoding.readVarUint8Array(decoder)
          if (clientStateVector.length > 0) {
            const serverDiffForClient = Y.encodeStateAsUpdate(room.ydoc, clientStateVector)
            const syncEncoder1 = encoding.createEncoder()
            encoding.writeVarUint(syncEncoder1, 1)
            encoding.writeVarUint8Array(syncEncoder1, serverDiffForClient)
            ws.send(encoding.toUint8Array(syncEncoder1))

            const serverStateVector = Y.encodeStateVector(room.ydoc)
            const syncEncoder2 = encoding.createEncoder()
            encoding.writeVarUint(syncEncoder2, 0)
            encoding.writeVarUint8Array(syncEncoder2, serverStateVector)
            ws.send(encoding.toUint8Array(syncEncoder2))
          }

          joined = true
        }
      } catch (err) {
        console.error('Error handling join:', err)
        ws.close(4002, 'Invalid join message')
      }
    }

    ws.on('message', onMessage)

    ws.on('close', () => {
      handleDisconnect(ws)
    })
  })
}

function handleMessage(ws: WebSocket, data: Buffer): void {
  const room = findRoomByClient(ws)
  if (!room) return

  const clientInfo = room.clients.get(ws)
  if (!clientInfo) return

  try {
    const decoder = decoding.createDecoder(new Uint8Array(data))
    const msgType = decoding.readVarUint(decoder)
    const payload = decoding.readVarUint8Array(decoder)

    switch (msgType) {
      case 0: {
        const diff = Y.encodeStateAsUpdate(room.ydoc, payload)
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, 1)
        encoding.writeVarUint8Array(encoder, diff)
        ws.send(encoding.toUint8Array(encoder))
        break
      }
      case 2: {
        Y.applyUpdate(room.ydoc, payload)
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, 2)
        encoding.writeVarUint8Array(encoder, payload)
        broadcastToRoom(clientInfo.roomId, encoding.toUint8Array(encoder), ws)
        break
      }
      case 3: {
        const cursorEncoder = encoding.createEncoder()
        encoding.writeVarUint(cursorEncoder, 3)
        encoding.writeVarUint8Array(cursorEncoder, payload)
        broadcastToRoom(clientInfo.roomId, encoding.toUint8Array(cursorEncoder), ws)
        break
      }
    }
  } catch (err) {
    console.error('Error handling message:', err)
  }
}

function handleDisconnect(ws: WebSocket): void {
  const room = findRoomByClient(ws)
  if (!room) return

  const clientInfo = room.clients.get(ws)
  if (!clientInfo) return

  room.clients.delete(ws)

  const clientsSet = roomsWithClients.get(clientInfo.roomId)
  if (clientsSet) {
    clientsSet.delete(clientInfo.userId)
  }

  const leavePayload = new TextEncoder().encode(
    JSON.stringify({ userId: clientInfo.userId }),
  )
  const leaveEncoder = encoding.createEncoder()
  encoding.writeVarUint(leaveEncoder, 7)
  encoding.writeVarUint8Array(leaveEncoder, leavePayload)
  broadcastToRoom(clientInfo.roomId, encoding.toUint8Array(leaveEncoder))

  if (room.clients.size === 0) {
    saveSnapshot(clientInfo.roomId, room.ydoc)
    rooms.delete(clientInfo.roomId)
    roomsWithClients.delete(clientInfo.roomId)
  }
}

function createRoom(roomId: string): RoomState {
  const ydoc = new Y.Doc()
  loadSnapshot(roomId, ydoc)
  const room: RoomState = { ydoc, clients: new Map(), colorIndex: 0 }
  rooms.set(roomId, room)
  return room
}

function findRoomByClient(ws: WebSocket): RoomState | undefined {
  for (const room of rooms.values()) {
    if (room.clients.has(ws)) return room
  }
  return undefined
}

function broadcastToRoom(roomId: string, data: Uint8Array, exclude?: WebSocket): void {
  const room = rooms.get(roomId)
  if (!room) return

  for (const client of room.clients.keys()) {
    if (client !== exclude && client.readyState === 1) {
      client.send(data)
    }
  }
}

export function getRooms(): Map<string, RoomState> {
  return rooms
}
