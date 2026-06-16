import { useState } from 'react'
import { X, Lock } from 'lucide-react'

interface PasswordModalProps {
  roomName: string
  onSubmit: (password: string) => void
  onCancel: () => void
  error: string | null
  loading: boolean
}

export default function PasswordModal({ roomName, onSubmit, onCancel, error, loading }: PasswordModalProps) {
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim()) {
      onSubmit(password)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent" />
            <h3 className="font-outfit text-lg font-semibold text-textPrimary">
              加入房间
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-textSecondary" />
          </button>
        </div>

        <p className="text-textSecondary text-sm mb-4">
          "<span className="text-textPrimary">{roomName}</span>" 需要密码才能加入
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入房间密码"
            className="w-full px-4 py-2.5 rounded-xl bg-navy/80 border border-white/10 text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all mb-3"
            autoFocus
          />

          {error && (
            <p className="text-red-400 text-sm mb-3">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-textSecondary hover:bg-white/10 transition-colors font-medium text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-navy font-semibold text-sm hover:bg-accentDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '验证中...' : '确认加入'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
