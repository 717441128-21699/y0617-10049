import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Lock, Users, PenTool } from 'lucide-react'
import type { RoomInfo } from '../../shared/types'
import { useRoomStore } from '@/stores/roomStore'
import PasswordModal from '@/components/PasswordModal'

export default function Lobby() {
  const navigate = useNavigate()
  const { userName, setUserName, setRoom } = useRoomStore()

  const [localName, setLocalName] = useState(userName)
  const [roomName, setRoomName] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [creating, setCreating] = useState(false)

  const [passwordModal, setPasswordModal] = useState<{
    open: boolean
    room: RoomInfo | null
  }>({ open: false, room: null })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms')
      const data = await res.json()
      if (data.success) {
        setRooms(data.data)
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchRooms()
    const interval = setInterval(fetchRooms, 5000)
    return () => clearInterval(interval)
  }, [fetchRooms])

  const handleNameSave = () => {
    if (localName.trim()) {
      setUserName(localName.trim())
    }
  }

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return
    if (!userName.trim()) {
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName.trim(),
          password: roomPassword.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        await handleVerify(data.data.roomId)
      }
    } catch {
      // error
    } finally {
      setCreating(false)
    }
  }

  const handleRoomClick = (room: RoomInfo) => {
    if (room.hasPassword) {
      setPasswordModal({ open: true, room })
      setPasswordError(null)
    } else {
      handleVerify(room.roomId)
    }
  }

  const handleVerify = async (roomId: string, password?: string) => {
    setVerifying(true)
    setPasswordError(null)
    try {
      const res = await fetch(`/api/rooms/${roomId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password || '' }),
      })
      const data = await res.json()
      if (data.success && data.data.valid) {
        const room = rooms.find((r) => r.roomId === roomId)
        setRoom(roomId, room?.name || '', data.data.token)
        setPasswordModal({ open: false, room: null })
        navigate(`/room/${roomId}`)
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

  const handlePasswordSubmit = (password: string) => {
    if (passwordModal.room) {
      handleVerify(passwordModal.room.roomId, password)
    }
  }

  const nameSaved = userName === localName.trim() && userName.trim() !== ''

  return (
    <div className="min-h-screen bg-navy relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,229,160,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,160,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="glass-strong rounded-3xl p-8 w-full max-w-2xl animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-2">
              <PenTool className="w-8 h-8 text-accent" />
              <h1 className="font-outfit text-4xl font-bold text-accent">
                SyncBoard
              </h1>
            </div>
            <p className="text-textSecondary text-lg">实时协同白板</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-textSecondary mb-2">你的昵称</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="输入昵称"
                className="flex-1 px-4 py-2.5 rounded-xl bg-navy/80 border border-white/10 text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
              />
              <button
                onClick={handleNameSave}
                disabled={nameSaved || !localName.trim()}
                className="px-5 py-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {nameSaved ? '已保存' : '保存'}
              </button>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 mb-6">
            <h2 className="font-outfit text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-accent" />
              创建房间
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="房间名称"
                className="flex-1 px-4 py-2.5 rounded-xl bg-navy/80 border border-white/10 text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
              />
              <input
                type="password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                placeholder="密码（可选）"
                className="flex-1 px-4 py-2.5 rounded-xl bg-navy/80 border border-white/10 text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
              />
              <button
                onClick={handleCreateRoom}
                disabled={creating || !roomName.trim() || !userName.trim()}
                className="px-6 py-2.5 rounded-xl bg-accent text-navy font-semibold text-sm hover:bg-accentDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {creating ? '创建中...' : '创建房间'}
              </button>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-outfit text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                可用房间
              </h2>
              <button
                onClick={fetchRooms}
                className="text-sm text-textSecondary hover:text-accent transition-colors"
              >
                刷新
              </button>
            </div>

            {rooms.length === 0 ? (
              <div className="text-center py-10 text-textSecondary">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无房间，创建一个开始协作吧</p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-1">
                {rooms.map((room) => (
                  <button
                    key={room.roomId}
                    onClick={() => handleRoomClick(room)}
                    className="w-full text-left px-5 py-4 rounded-xl bg-navy/60 border border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {room.hasPassword && (
                          <Lock className="w-4 h-4 text-textSecondary group-hover:text-accent transition-colors" />
                        )}
                        <span className="font-medium text-textPrimary">
                          {room.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-textSecondary text-sm">
                        <Users className="w-4 h-4" />
                        <span>{room.userCount}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {passwordModal.open && passwordModal.room && (
        <PasswordModal
          roomName={passwordModal.room.name}
          onSubmit={handlePasswordSubmit}
          onCancel={() => {
            setPasswordModal({ open: false, room: null })
            setPasswordError(null)
          }}
          error={passwordError}
          loading={verifying}
        />
      )}
    </div>
  )
}
