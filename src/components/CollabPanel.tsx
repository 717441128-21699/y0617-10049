import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, LogOut, ChevronUp, ChevronDown, Copy, Download } from 'lucide-react'
import { useRoomStore } from '@/stores/roomStore'
import { useCrdtStore } from '@/stores/crdtStore'

export default function CollabPanel() {
  const navigate = useNavigate()
  const { roomName, roomId, onlineUsers, leaveRoom } = useRoomStore()
  const { elements } = useCrdtStore()
  const [collapsed, setCollapsed] = useState(false)

  const handleLeaveRoom = () => {
    leaveRoom()
    navigate('/')
  }

  const handleCopyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId)
    }
  }

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#1a1b2e'
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    ctx.drawImage(canvas, 0, 0)
    const link = document.createElement('a')
    const safeName = (roomName || 'export').replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_')
    link.download = `syncboard-${safeName}.png`
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="fixed top-4 right-4 z-30 w-64 animate-fade-in">
      <div className="glass-strong rounded-2xl overflow-hidden">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <span className="font-outfit font-semibold text-sm text-textPrimary truncate max-w-[140px]">
              {roomName}
            </span>
          </div>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-textSecondary" />
          ) : (
            <ChevronUp className="w-4 h-4 text-textSecondary" />
          )}
        </button>

        {!collapsed && (
          <div className="px-4 pb-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-[11px] text-textSecondary">房间 ID:</span>
              <span className="text-[11px] text-textPrimary font-mono truncate max-w-[100px]">
                {roomId?.slice(0, 8)}...
              </span>
              <button
                onClick={handleCopyRoomId}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="复制房间 ID"
              >
                <Copy className="w-3 h-3 text-textSecondary" />
              </button>
            </div>

            <div className="mb-3">
              <span className="text-[11px] text-textSecondary px-1 block mb-2">
                在线 ({onlineUsers.length})
              </span>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {onlineUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 px-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: user.color }}
                    />
                    <span className="text-sm text-textPrimary truncate">{user.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-textSecondary px-1 mb-3">
              <span>元素: {elements.length}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExportPNG}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-textSecondary hover:text-textPrimary hover:bg-white/10 transition-colors text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                导出
              </button>
              <button
                onClick={handleLeaveRoom}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                离开
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
