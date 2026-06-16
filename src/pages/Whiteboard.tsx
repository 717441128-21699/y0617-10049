import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { WifiOff, RefreshCw } from 'lucide-react'
import Canvas from '@/components/Canvas'
import Toolbar from '@/components/Toolbar'
import CollabPanel from '@/components/CollabPanel'
import ActionBar from '@/components/ActionBar'
import { useRoomStore } from '@/stores/roomStore'
import { useCrdtStore, type ConnectionState } from '@/stores/crdtStore'

export default function Whiteboard() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { token, roomName, userName, restoreRoom, setRoom } = useRoomStore()
  const { connect, disconnect, connectionState } = useCrdtStore()

  useEffect(() => {
    if (!roomId) {
      navigate('/')
      return
    }

    let effectiveToken = token
    let effectiveRoomName = roomName

    if (!effectiveToken) {
      const restored = restoreRoom()
      if (restored) {
        const state = useRoomStore.getState()
        effectiveToken = state.token
        effectiveRoomName = state.roomName
      }
    }

    if (!effectiveToken) {
      navigate('/')
      return
    }

    if (roomId && effectiveToken) {
      connect(roomId, effectiveToken, userName || '匿名用户')
    }

    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  if (!roomId) {
    return null
  }

  const isConnected = connectionState === 'connected'
  const isReconnecting = connectionState === 'reconnecting'
  const isConnecting = connectionState === 'connecting'

  return (
    <div className="h-screen w-screen overflow-hidden bg-navy relative">
      <Canvas />
      <Toolbar />
      <CollabPanel />
      <ActionBar />

      {!isConnected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/80 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl px-8 py-6 text-center animate-fade-in max-w-sm">
            {isReconnecting ? (
              <>
                <WifiOff className="w-8 h-8 text-red-400 mx-auto mb-4" />
                <p className="text-textPrimary font-outfit font-semibold">连接断开</p>
                <p className="text-textSecondary text-sm mt-1">
                  正在尝试重新连接 {roomName || '房间'}...
                </p>
                <div className="flex items-center justify-center gap-2 mt-3 text-textSecondary text-xs">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>自动重连中</span>
                </div>
              </>
            ) : isConnecting ? (
              <>
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-textPrimary font-outfit font-semibold">连接中...</p>
                <p className="text-textSecondary text-sm mt-1">
                  正在加入 {roomName || '房间'}
                </p>
              </>
            ) : (
              <>
                <WifiOff className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
                <p className="text-textPrimary font-outfit font-semibold">连接已断开</p>
                <p className="text-textSecondary text-sm mt-1">
                  请检查网络连接
                </p>
                <button
                  onClick={() => {
                    if (roomId && token) {
                      connect(roomId, token, userName || '匿名用户')
                    } else {
                      navigate('/')
                    }
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors text-sm"
                >
                  重新连接
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
