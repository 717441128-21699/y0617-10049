import { ZoomIn, ZoomOut, Download, RotateCcw, RotateCw } from 'lucide-react'
import { useWhiteboardStore } from '@/stores/whiteboard-store'
import { useCrdtStore } from '@/stores/crdtStore'
import { useRoomStore } from '@/stores/roomStore'

export default function ActionBar() {
  const { canvasState, setCanvasState, resetCanvas } = useWhiteboardStore()
  const { canUndo, canRedo, undo, redo } = useCrdtStore()
  const { roomName } = useRoomStore()
  const zoomPercent = Math.round(canvasState.scale * 100)

  const handleZoomIn = () => {
    const newScale = Math.min(5, canvasState.scale * 1.2)
    setCanvasState({ scale: newScale })
  }

  const handleZoomOut = () => {
    const newScale = Math.max(0.1, canvasState.scale / 1.2)
    setCanvasState({ scale: newScale })
  }

  const handleResetZoom = () => {
    resetCanvas()
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
      <div className="glass-strong rounded-full px-3 py-2 flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="w-9 h-9 flex items-center justify-center rounded-full text-textSecondary hover:text-textPrimary hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="撤销"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          className="w-9 h-9 flex items-center justify-center rounded-full text-textSecondary hover:text-textPrimary hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="重做"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <button
          onClick={handleZoomOut}
          className="w-9 h-9 flex items-center justify-center rounded-full text-textSecondary hover:text-textPrimary hover:bg-white/5 transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetZoom}
          className="px-3 py-1.5 rounded-full text-xs font-medium text-textPrimary hover:bg-white/5 transition-colors min-w-[50px] text-center"
          title="重置缩放"
        >
          {zoomPercent}%
        </button>

        <button
          onClick={handleZoomIn}
          className="w-9 h-9 flex items-center justify-center rounded-full text-textSecondary hover:text-textPrimary hover:bg-white/5 transition-colors"
          title="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <button
          onClick={handleExportPNG}
          className="w-9 h-9 flex items-center justify-center rounded-full text-textSecondary hover:text-textPrimary hover:bg-white/5 transition-colors"
          title="导出 PNG"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
