import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Canvas from '@/components/Canvas'
import Toolbar from '@/components/Toolbar'
import CollabPanel from '@/components/CollabPanel'
import ActionBar from '@/components/ActionBar'
import { useRoomStore } from '@/stores/roomStore'
import { useCrdtStore } from '@/stores/crdtStore'

export default function Whiteboard() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { token, roomName, userName } = useRoomStore()
  const { connect, disconnect, connected } = useCrdtStore()

  useEffect(() => {
    if (!roomId || !token) {
      navigate('/')
      return
    }

    connect(roomId, token, userName || '匿名用户')

    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token])

  if (!roomId || !token) {
    return null
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-navy relative">
      <Canvas />
      <Toolbar />
      <CollabPanel />
      <ActionBar />

      {!connected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/80 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl px-8 py-6 text-center animate-fade-in">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-textPrimary font-outfit font-semibold">连接中...</p>
            <p className="text-textSecondary text-sm mt-1">
              正在加入 {roomName || '房间'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
