import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { RoomInfo, OnlineUser } from '../../shared/types'

function generateUserId(): string {
  const stored = localStorage.getItem('wb_userId')
  if (stored) return stored
  const id = uuidv4()
  localStorage.setItem('wb_userId', id)
  return id
}

function generateUserName(): string {
  const stored = localStorage.getItem('wb_userName')
  if (stored) return stored
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `User-${suffix}`
}

function loadPersistedRoom(): { roomId: string; roomName: string; token: string } | null {
  try {
    const raw = sessionStorage.getItem('wb_currentRoom')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

interface RoomState {
  rooms: RoomInfo[]
  roomId: string | null
  roomName: string | null
  token: string | null
  onlineUsers: OnlineUser[]
  userId: string
  userName: string
  fetchRooms: () => Promise<void>
  createRoom: (name: string, password?: string) => Promise<{ roomId: string; name: string } | null>
  verifyRoom: (roomId: string, password: string) => Promise<{ valid: boolean; token?: string; roomName?: string }>
  setRoom: (roomId: string, roomName: string, token: string) => void
  setUserName: (name: string) => void
  setOnlineUsers: (users: OnlineUser[]) => void
  addOnlineUser: (user: OnlineUser) => void
  removeOnlineUser: (userId: string) => void
  leaveRoom: () => void
  restoreRoom: () => boolean
}

const persisted = loadPersistedRoom()

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  roomId: persisted?.roomId ?? null,
  roomName: persisted?.roomName ?? null,
  token: persisted?.token ?? null,
  onlineUsers: [],
  userId: generateUserId(),
  userName: generateUserName(),

  fetchRooms: async () => {
    try {
      const res = await fetch('/api/rooms')
      const json = await res.json()
      if (json.success) {
        set({ rooms: json.data })
      }
    } catch {
      // ignore
    }
  },

  createRoom: async (name, password) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      })
      const json = await res.json()
      if (json.success) {
        await get().fetchRooms()
        return { roomId: json.data.roomId, name: json.data.name }
      }
      return null
    } catch {
      return null
    }
  },

  verifyRoom: async (roomId, password) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (json.success && json.data.valid) {
        return { valid: true, token: json.data.token, roomName: json.data.roomName }
      }
      return { valid: false }
    } catch {
      return { valid: false }
    }
  },

  setRoom: (roomId, roomName, token) => {
    sessionStorage.setItem('wb_currentRoom', JSON.stringify({ roomId, roomName, token }))
    set({ roomId, roomName, token })
  },

  setUserName: (name) => {
    localStorage.setItem('wb_userName', name)
    set({ userName: name })
  },

  setOnlineUsers: (users) => {
    set({ onlineUsers: users })
  },

  addOnlineUser: (user) => {
    set((state) => {
      if (state.onlineUsers.some((u) => u.id === user.id)) return state
      return { onlineUsers: [...state.onlineUsers, user] }
    })
  },

  removeOnlineUser: (userId) => {
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((u) => u.id !== userId),
    }))
  },

  leaveRoom: () => {
    sessionStorage.removeItem('wb_currentRoom')
    set({ roomId: null, roomName: null, token: null, onlineUsers: [] })
  },

  restoreRoom: () => {
    const p = loadPersistedRoom()
    if (p && p.roomId && p.token) {
      set({ roomId: p.roomId, roomName: p.roomName, token: p.token })
      return true
    }
    return false
  },
}))
