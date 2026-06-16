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

interface RoomState {
  rooms: RoomInfo[]
  roomId: string | null
  roomName: string | null
  token: string | null
  onlineUsers: OnlineUser[]
  userId: string
  userName: string
  fetchRooms: () => Promise<void>
  createRoom: (name: string, password?: string) => Promise<string | null>
  verifyRoom: (roomId: string, password: string) => Promise<{ valid: boolean; token?: string }>
  setRoom: (roomId: string, roomName: string, token: string) => void
  setUserName: (name: string) => void
  setOnlineUsers: (users: OnlineUser[]) => void
  addOnlineUser: (user: OnlineUser) => void
  removeOnlineUser: (userId: string) => void
  leaveRoom: () => void
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  roomId: null,
  roomName: null,
  token: null,
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
        return json.data.roomId
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
        return { valid: true, token: json.data.token }
      }
      return { valid: false }
    } catch {
      return { valid: false }
    }
  },

  setRoom: (roomId, roomName, token) => {
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
    set({ roomId: null, roomName: null, token: null, onlineUsers: [] })
  },
}))
