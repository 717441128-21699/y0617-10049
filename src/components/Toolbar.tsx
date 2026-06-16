import { MousePointer2, Pencil, Minus, Square, Circle, Type } from 'lucide-react'
import type { ToolType } from '../../shared/types'
import { useWhiteboardStore } from '@/stores/whiteboard-store'

const TOOLS: { type: ToolType; icon: React.ElementType; label: string }[] = [
  { type: 'select', icon: MousePointer2, label: '选择' },
  { type: 'freehand', icon: Pencil, label: '画笔' },
  { type: 'line', icon: Minus, label: '直线' },
  { type: 'rect', icon: Square, label: '矩形' },
  { type: 'circle', icon: Circle, label: '圆形' },
  { type: 'text', icon: Type, label: '文字' },
]

const PRESET_COLORS = [
  '#00e5a0', '#ff6b6b', '#4ecdc4', '#ffd93d',
  '#6c5ce7', '#fd79a8', '#f0f0f5', '#8b8da3',
]

export default function Toolbar() {
  const { toolType, setToolType, toolConfig, setToolConfig } = useWhiteboardStore()

  const currentTool = toolType
  const showFill = currentTool === 'rect' || currentTool === 'circle'
  const showFontSize = currentTool === 'text'

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 p-2 glass-strong rounded-2xl animate-fade-in">
      {TOOLS.map(({ type, icon: Icon, label }) => (
        <div key={type} className="relative group">
          <button
            onClick={() => setToolType(type)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
              toolType === type
                ? 'bg-accent/20 text-accent glow-accent'
                : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'
            }`}
          >
            <Icon className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-2 px-2.5 py-1 rounded-lg bg-navy text-textPrimary text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
            {label}
          </div>
        </div>
      ))}

      <div className="w-full h-px bg-white/10 my-1" />

      <div className="relative group">
        <div className="w-10 h-10 flex items-center justify-center rounded-xl">
          <div
            className="w-5 h-5 rounded-full border-2 border-white/20"
            style={{ backgroundColor: toolConfig.color }}
          />
        </div>
        <div className="absolute left-full ml-2 px-2.5 py-1 rounded-lg bg-navy text-textPrimary text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
          描边颜色
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 px-0.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setToolConfig({ color })}
            className={`w-[18px] h-[18px] rounded-full transition-all ${
              toolConfig.color === color ? 'ring-2 ring-accent ring-offset-1 ring-offset-navyLight' : ''
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <input
        type="color"
        value={toolConfig.color}
        onChange={(e) => setToolConfig({ color: e.target.value })}
        className="w-full h-6 rounded-lg cursor-pointer bg-transparent border border-white/10"
        title="自定义颜色"
      />

      <div className="w-full h-px bg-white/10 my-1" />

      <div className="px-1">
        <label className="text-[10px] text-textSecondary block mb-1">线宽</label>
        <input
          type="range"
          min={1}
          max={20}
          value={toolConfig.lineWidth}
          onChange={(e) => setToolConfig({ lineWidth: Number(e.target.value) })}
          className="w-full h-1 accent-accent cursor-pointer"
        />
        <div className="text-center text-[10px] text-textSecondary mt-0.5">
          {toolConfig.lineWidth}px
        </div>
      </div>

      {showFill && (
        <>
          <div className="w-full h-px bg-white/10 my-1" />
          <div className="relative group">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl">
              {toolConfig.fill === 'transparent' ? (
                <div className="w-5 h-5 rounded border-2 border-dashed border-white/20" />
              ) : (
                <div
                  className="w-5 h-5 rounded-full border-2 border-white/20"
                  style={{ backgroundColor: toolConfig.fill }}
                />
              )}
            </div>
            <div className="absolute left-full ml-2 px-2.5 py-1 rounded-lg bg-navy text-textPrimary text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
              填充颜色
            </div>
          </div>

          <button
            onClick={() => setToolConfig({ fill: 'transparent' })}
            className={`w-full text-[10px] py-1 rounded-lg transition-colors ${
              toolConfig.fill === 'transparent'
                ? 'bg-accent/20 text-accent'
                : 'text-textSecondary hover:bg-white/5'
            }`}
          >
            无填充
          </button>

          <div className="grid grid-cols-4 gap-1 px-0.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={`fill-${color}`}
                onClick={() => setToolConfig({ fill: color })}
                className={`w-[18px] h-[18px] rounded-full transition-all ${
                  toolConfig.fill === color ? 'ring-2 ring-accent ring-offset-1 ring-offset-navyLight' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <input
            type="color"
            value={toolConfig.fill === 'transparent' ? '#ffffff' : toolConfig.fill}
            onChange={(e) => setToolConfig({ fill: e.target.value })}
            className="w-full h-6 rounded-lg cursor-pointer bg-transparent border border-white/10"
            title="自定义填充色"
          />
        </>
      )}

      {showFontSize && (
        <>
          <div className="w-full h-px bg-white/10 my-1" />
          <div className="px-1">
            <label className="text-[10px] text-textSecondary block mb-1">字号</label>
            <input
              type="number"
              min={12}
              max={72}
              value={toolConfig.fontSize}
              onChange={(e) => {
                const val = Math.min(72, Math.max(12, Number(e.target.value) || 12))
                setToolConfig({ fontSize: val })
              }}
              className="w-full px-2 py-1 rounded-lg bg-navy/80 border border-white/10 text-textPrimary text-xs text-center focus:outline-none focus:border-accent/50"
            />
          </div>
        </>
      )}
    </div>
  )
}
