import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { WifiOff, RefreshCw, Lock, ArrowLeft } from 'lucide-react'
import Canvas from '@/components/Canvas'
import Toolbar from '@/components/Toolbar'
import CollabPanel from '@/components/CollabPanel'
import ActionBar from '@/components/ActionBar'
import { useRoomStore } from '@/stores/roomStore'
import { useCrdtStore, type ConnectionState } from '@/stores/crdtStore'

export default function Whiteboard() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { token, roomName, userName, restoreRoom, setRoom, setUserName } = useRoomStore()
  const { connect, disconnect, connectionState, authFailureReason, clearAuthFailure } = useCrdtStore()

  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!roomId) {
      navigate('/')
      return
    }

    let effectiveToken = token

    if (!effectiveToken) {
      const restored = restoreRoom()
      if (restored) {
        const state = useRoomStore.getState()
        effectiveToken = state.token
      }
    }

    if (!effectiveToken) {
      setPasswordModalOpen(true)
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

  useEffect(() => {
    if (connectionState === 'auth-failed') {
      setPasswordModalOpen(true)
    }
  }, [connectionState])

  if (!roomId) {
    return null
  }

  const isConnected = connectionState === 'connected'
  const isReconnecting = connectionState === 'reconnecting'
  const isConnecting = connectionState === 'connecting'
  const isAuthFailed = connectionState === 'auth-failed'

  const handlePasswordSubmit = async () => {
    setVerifying(true)
    setPasswordError(null)
    try {
      const res = await fetch(`/api/rooms/${roomId}/reverify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: passwordInput,
          existingToken: token || undefined,
        }),
      })
      const data = await res.json()
      if (data.success && data.data.valid) {
        clearAuthFailure()
        setRoom(roomId, data.data.roomName || roomName || '', data.data.token)
        setPasswordModalOpen(false)
        setPasswordInput('')
        connect(roomId, data.data.token, userName || '匿名用户')
      } else if (data.success && !data.data.valid) {
        setPasswordError('密码错误，请重试')
      } else {
        setPasswordError(data.error || '验证失败')
      }
    } catch {
      setPasswordError('网络错误，请重试')
    } finally {
      setVerifying(false)
    }
  }

  const handleBackToLobby = () => {
    clearAuthFailure()
    disconnect()
    navigate('/')
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-navy relative">
      <Canvas />
      <Toolbar />
      <CollabPanel />
      <ActionBar />

      {!isConnected && !passwordModalOpen && (
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
            ) : isAuthFailed ? (
              <>
                <Lock className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
                <p className="text-textPrimary font-outfit font-semibold">需要重新验证</p>
                <p className="text-textSecondary text-sm mt-1">
                  {authFailureReason || '访问凭证已失效'}
                </p>
              </>
            ) : (
              <>
                <WifiOff className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
                <p className="text-textPrimary font-outfit font-semibold">连接已断开</p>
                <p className="text-textSecondary text-sm mt-1">
                  请检查网络连接
                </p>
                <div className="flex gap-2 mt-4 justify-center">
                  <button
                    onClick={handleBackToLobby}
                    className="px-4 py-2 rounded-xl bg-white/5 text-textSecondary hover:bg-white/10 transition-colors text-sm flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    返回大厅
                  </button>
                  <button
                    onClick={() => {
                      if (roomId && token) {
                        connect(roomId, token, userName || '匿名用户')
                      } else {
                        setPasswordModalOpen(true)
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors text-sm"
                  >
                    重新连接
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/90 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-8 w-full max-w-md animate-fade-in">
            <div className="text-center mb-6">
              <Lock className="w-10 h-10 text-accent mx-auto mb-3" />
              <h2 className="font-outfit text-xl font-bold text-textPrimary">
                {isAuthFailed ? '凭证已过期' : '房间需要密码'}
              </h2>
              <p className="text-textSecondary text-sm mt-1">
                {isAuthFailed
                  ? authFailureReason || '请重新输入房间密码以继续协作'
                  : `请输入 "${roomName || '房间'}" 的访问密码`}
              </p>
            </div>

            <div className="space-y-4">
              {!userName && (
                <div>
                  <label className="block text-sm text-textSecondary mb-2">你的昵称</label>
                  <input
                    type="text"
                    value={userName || ''}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="输入昵称"
                    className="w-full px-4 py-2.5 rounded-xl bg-navy/80 border border-white/10 text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-textSecondary mb-2">房间密码</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="输入密码"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy/80 border border-white/10 text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-400 text-xs mt-2">{passwordError}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleBackToLobby}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-textSecondary hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  返回大厅
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={verifying || !passwordInput.trim() || (userName && !userName.trim())}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-navy font-semibold text-sm hover:bg-accentDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? '验证中...' : '进入房间'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
