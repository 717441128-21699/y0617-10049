import { create } from 'zustand'

export interface RemoteCursor {
  x: number
  y: number
  name: string
  color: string
}

interface CursorState {
  remoteCursors: Map<string, RemoteCursor>
  updateCursor: (userId: string, x: number, y: number, name: string, color: string) => void
  removeCursor: (userId: string) => void
  clearAll: () => void
}

export const useCursorStore = create<CursorState>((set) => ({
  remoteCursors: new Map(),

  updateCursor: (userId, x, y, name, color) => {
    set((state) => {
      const next = new Map(state.remoteCursors)
      next.set(userId, { x, y, name, color })
      return { remoteCursors: next }
    })
  },

  removeCursor: (userId) => {
    set((state) => {
      const next = new Map(state.remoteCursors)
      next.delete(userId)
      return { remoteCursors: next }
    })
  },

  clearAll: () => {
    set({ remoteCursors: new Map() })
  },
}))
