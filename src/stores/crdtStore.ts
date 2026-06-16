import { create } from 'zustand'
import * as Y from 'yjs'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import type { DrawingElement, OnlineUser } from '../../shared/types'
import { useCursorStore } from './cursor-store'
import { useRoomStore } from './roomStore'

interface CrdtState {
  ydoc: Y.Doc | null
  yelements: Y.Array<Y.Map<unknown>> | null
  ws: WebSocket | null
  clientId: string
  undoManager: Y.UndoManager | null
  elements: DrawingElement[]
  connected: boolean
  canUndo: boolean
  canRedo: boolean
  connect: (roomId: string, token: string, userName: string) => void
  disconnect: () => void
  addElement: (element: DrawingElement) => void
  updateElement: (id: string, changes: Partial<DrawingElement>) => void
  deleteElement: (id: string) => void
  undo: () => void
  redo: () => void
  sendCursor: (x: number, y: number) => void
}

function ymapToElement(ymap: Y.Map<unknown>): DrawingElement {
  const obj: Record<string, unknown> = {}
  ymap.forEach((val, key) => {
    if (val instanceof Y.Map) {
      obj[key] = ymapToElement(val)
    } else if (val instanceof Y.Array) {
      const arr: unknown[] = []
      for (let i = 0; i < val.length; i++) {
        const item = val.get(i)
        arr.push(item instanceof Y.Map ? ymapToElement(item) : item)
      }
      obj[key] = arr
    } else {
      obj[key] = val
    }
  })
  return obj as unknown as DrawingElement
}

function syncLocalElements(yelements: Y.Array<Y.Map<unknown>>): DrawingElement[] {
  const result: DrawingElement[] = []
  for (let i = 0; i < yelements.length; i++) {
    const ymap = yelements.get(i)
    result.push(ymapToElement(ymap))
  }
  return result
}

function elementToYMap(element: DrawingElement): Y.Map<unknown> {
  const ymap = new Y.Map<unknown>()
  for (const [key, value] of Object.entries(element)) {
    if (Array.isArray(value)) {
      const yarr = new Y.Array<unknown>()
      yarr.push(value.map((v) => (typeof v === 'object' && v !== null ? objectToYMap(v) : v)))
      ymap.set(key, yarr)
    } else if (typeof value === 'object' && value !== null) {
      ymap.set(key, objectToYMap(value))
    } else {
      ymap.set(key, value)
    }
  }
  return ymap
}

function objectToYMap(obj: Record<string, unknown>): Y.Map<unknown> {
  const ymap = new Y.Map<unknown>()
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      const yarr = new Y.Array<unknown>()
      yarr.push(value.map((v) => (typeof v === 'object' && v !== null ? objectToYMap(v as Record<string, unknown>) : v)))
      ymap.set(key, yarr)
    } else if (typeof value === 'object' && value !== null) {
      ymap.set(key, objectToYMap(value as Record<string, unknown>))
    } else {
      ymap.set(key, value)
    }
  }
  return ymap
}

function buildWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export const useCrdtStore = create<CrdtState>((set, get) => ({
  ydoc: null,
  yelements: null,
  ws: null,
  clientId: `client-${Math.random().toString(36).slice(2, 10)}`,
  undoManager: null,
  elements: [],
  connected: false,
  canUndo: false,
  canRedo: false,

  connect: (roomId, token, userName) => {
    const { clientId } = get()
    const ydoc = new Y.Doc()
    const yelements = ydoc.getArray<Y.Map<unknown>>('elements')

    const undoManager = new Y.UndoManager(yelements, {
      captureTransaction: (tr) => tr.origin === clientId,
    })

    const updateUndoState = () => {
      set({
        canUndo: undoManager.undoStack.length > 0,
        canRedo: undoManager.redoStack.length > 0,
      })
    }
    undoManager.on('stack-item-added', updateUndoState)
    undoManager.on('stack-item-popped', updateUndoState)
    undoManager.on('stack-cleared', updateUndoState)

    const observer = () => {
      set({ elements: syncLocalElements(yelements) })
    }
    yelements.observeDeep(observer)

    set({
      ydoc,
      yelements,
      undoManager,
      elements: syncLocalElements(yelements),
    })

    const wsUrl = buildWsUrl()
    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'

    ws.addEventListener('open', () => {
      const joinPayload = new TextEncoder().encode(
        JSON.stringify({ roomId, token, userName, userId: clientId }),
      )
      const stateVector = Y.encodeStateVector(ydoc)

      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, 4)
      encoding.writeVarUint8Array(encoder, joinPayload)
      encoding.writeVarUint8Array(encoder, stateVector)
      ws.send(encoding.toUint8Array(encoder))

      set({ ws, connected: true })
    })

    ws.addEventListener('message', (event) => {
      const data = new Uint8Array(event.data)
      const decoder = decoding.createDecoder(data)
      const msgType = decoding.readVarUint(decoder)
      const payload = decoding.readVarUint8Array(decoder)

      switch (msgType) {
        case 0: {
          const diff = Y.encodeStateAsUpdate(ydoc, payload)
          const respEncoder = encoding.createEncoder()
          encoding.writeVarUint(respEncoder, 1)
          encoding.writeVarUint8Array(respEncoder, diff)
          ws.send(encoding.toUint8Array(respEncoder))
          break
        }
        case 1: {
          Y.applyUpdate(ydoc, payload)
          break
        }
        case 2: {
          Y.applyUpdate(ydoc, payload)
          break
        }
        case 3: {
          try {
            const cursorData = JSON.parse(new TextDecoder().decode(payload))
            if (cursorData.userId && cursorData.x != null && cursorData.y != null) {
              useCursorStore
                .getState()
                .updateCursor(
                  cursorData.userId,
                  cursorData.x,
                  cursorData.y,
                  cursorData.name ?? '',
                  cursorData.color ?? '#fff',
                )
            }
          } catch {
            // ignore
          }
          break
        }
        case 5: {
          try {
            const welcomeData = JSON.parse(new TextDecoder().decode(payload))
            if (welcomeData.users) {
              useRoomStore.getState().setOnlineUsers(welcomeData.users as OnlineUser[])
            }
          } catch {
            // ignore
          }
          break
        }
        case 6: {
          try {
            const joinData = JSON.parse(new TextDecoder().decode(payload))
            if (joinData.user) {
              useRoomStore.getState().addOnlineUser(joinData.user as OnlineUser)
            }
          } catch {
            // ignore
          }
          break
        }
        case 7: {
          try {
            const leaveData = JSON.parse(new TextDecoder().decode(payload))
            if (leaveData.userId) {
              useRoomStore.getState().removeOnlineUser(leaveData.userId as string)
              useCursorStore.getState().removeCursor(leaveData.userId as string)
            }
          } catch {
            // ignore
          }
          break
        }
      }
    })

    ws.addEventListener('close', () => {
      set({ connected: false })
    })

    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === clientId && ws.readyState === WebSocket.OPEN) {
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, 2)
        encoding.writeVarUint8Array(encoder, update)
        ws.send(encoding.toUint8Array(encoder))
      }
    })
  },

  disconnect: () => {
    const { ws, ydoc } = get()
    if (ws) {
      ws.close()
    }
    if (ydoc) {
      ydoc.destroy()
    }
    useCursorStore.getState().clearAll()
    set({
      ydoc: null,
      yelements: null,
      ws: null,
      undoManager: null,
      elements: [],
      connected: false,
      canUndo: false,
      canRedo: false,
    })
  },

  addElement: (element) => {
    const { ydoc, yelements, clientId } = get()
    if (!ydoc || !yelements) return
    const ymap = elementToYMap(element)
    ydoc.transact(() => {
      yelements.push([ymap])
    }, clientId)
  },

  updateElement: (id, changes) => {
    const { ydoc, yelements, clientId } = get()
    if (!ydoc || !yelements) return
    ydoc.transact(() => {
      for (let i = 0; i < yelements.length; i++) {
        const ymap = yelements.get(i)
        if (ymap.get('id') === id) {
          for (const [key, value] of Object.entries(changes)) {
            ymap.set(key, value)
          }
          break
        }
      }
    }, clientId)
  },

  deleteElement: (id) => {
    const { ydoc, yelements, clientId } = get()
    if (!ydoc || !yelements) return
    ydoc.transact(() => {
      for (let i = 0; i < yelements.length; i++) {
        if (yelements.get(i).get('id') === id) {
          yelements.delete(i)
          break
        }
      }
    }, clientId)
  },

  undo: () => {
    const { undoManager } = get()
    undoManager?.undo()
  },

  redo: () => {
    const { undoManager } = get()
    undoManager?.redo()
  },

  sendCursor: (x, y) => {
    const { ws, clientId } = get()
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const userName = useRoomStore.getState().userName
    const users = useRoomStore.getState().onlineUsers
    const myUser = users.find((u) => u.id === clientId)
    const cursorPayload = new TextEncoder().encode(
      JSON.stringify({ userId: clientId, x, y, name: userName, color: myUser?.color ?? '#00e5a0' }),
    )
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, 3)
    encoding.writeVarUint8Array(encoder, cursorPayload)
    ws.send(encoding.toUint8Array(encoder))
  },
}))
