import { useRef, useEffect, useState, useCallback } from 'react'
import type { DrawingElement } from '../../shared/types'
import { useWhiteboardStore } from '@/stores/whiteboard-store'
import { useCrdtStore } from '@/stores/crdtStore'
import { useRoomStore } from '@/stores/roomStore'

interface DrawingState {
  isDrawing: boolean
  isPanning: boolean
  startX: number
  startY: number
  points: { x: number; y: number }[]
  previewElement: DrawingElement | null
  spaceHeld: boolean
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  const { toolType, toolConfig, canvasState, setCanvasState } = useWhiteboardStore()
  const { elements, addElement } = useCrdtStore()
  const { userName } = useRoomStore()

  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    isPanning: false,
    startX: 0,
    startY: 0,
    points: [],
    previewElement: null,
    spaceHeld: false,
  })

  const [textInput, setTextInput] = useState<{
    visible: boolean
    x: number
    y: number
    canvasX: number
    canvasY: number
  }>({
    visible: false,
    x: 0,
    y: 0,
    canvasX: 0,
    canvasY: 0,
  })

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      return {
        x: (screenX - rect.left - canvasState.offsetX) / canvasState.scale,
        y: (screenY - rect.top - canvasState.offsetY) / canvasState.scale,
      }
    },
    [canvasState.offsetX, canvasState.offsetY, canvasState.scale]
  )

  const generateId = () => crypto.randomUUID()

  const getCursorClass = () => {
    if (drawingState.spaceHeld || drawingState.isPanning) return 'canvas-move'
    if (toolType === 'text') return 'canvas-text'
    if (toolType === 'select') return 'canvas-move'
    return 'canvas-crosshair'
  }

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

    ctx.save()
    ctx.translate(canvasState.offsetX, canvasState.offsetY)
    ctx.scale(canvasState.scale, canvasState.scale)

    const drawGrid = () => {
      const gridSize = 30
      const w = canvas.width / dpr / canvasState.scale
      const h = canvas.height / dpr / canvasState.scale
      const startXGrid = Math.floor(-canvasState.offsetX / canvasState.scale / gridSize) * gridSize
      const startYGrid = Math.floor(-canvasState.offsetY / canvasState.scale / gridSize) * gridSize

      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1 / canvasState.scale
      ctx.beginPath()
      for (let x = startXGrid; x < startXGrid + w + gridSize; x += gridSize) {
        ctx.moveTo(x, startYGrid)
        ctx.lineTo(x, startYGrid + h + gridSize)
      }
      for (let y = startYGrid; y < startYGrid + h + gridSize; y += gridSize) {
        ctx.moveTo(startXGrid, y)
        ctx.lineTo(startXGrid + w + gridSize, y)
      }
      ctx.stroke()
    }
    drawGrid()

    const allElements = drawingState.previewElement
      ? [...elements, drawingState.previewElement]
      : elements

    for (const el of allElements) {
      ctx.save()
      switch (el.type) {
        case 'freehand': {
          if (el.points.length < 2) break
          ctx.strokeStyle = el.color
          ctx.lineWidth = el.lineWidth
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          ctx.moveTo(el.points[0].x, el.points[0].y)
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y)
          }
          ctx.stroke()
          break
        }
        case 'line': {
          ctx.strokeStyle = el.color
          ctx.lineWidth = el.lineWidth
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(el.start.x, el.start.y)
          ctx.lineTo(el.end.x, el.end.y)
          ctx.stroke()
          break
        }
        case 'rect': {
          if (el.fill && el.fill !== 'transparent') {
            ctx.fillStyle = el.fill
            ctx.fillRect(el.x, el.y, el.width, el.height)
          }
          ctx.strokeStyle = el.color
          ctx.lineWidth = el.lineWidth
          ctx.strokeRect(el.x, el.y, el.width, el.height)
          break
        }
        case 'circle': {
          ctx.beginPath()
          ctx.arc(el.cx, el.cy, el.radius, 0, Math.PI * 2)
          if (el.fill && el.fill !== 'transparent') {
            ctx.fillStyle = el.fill
            ctx.fill()
          }
          ctx.strokeStyle = el.color
          ctx.lineWidth = el.lineWidth
          ctx.stroke()
          break
        }
        case 'text': {
          ctx.fillStyle = el.color
          ctx.font = `${el.fontSize}px "DM Sans", sans-serif`
          ctx.textBaseline = 'top'
          ctx.fillText(el.content, el.x, el.y)
          break
        }
      }
      ctx.restore()
    }

    ctx.restore()
  }, [elements, drawingState.previewElement, canvasState])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      renderCanvas()
    }

    const observer = new ResizeObserver(resizeCanvas)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    resizeCanvas()

    return () => observer.disconnect()
  }, [renderCanvas])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setDrawingState((prev) => ({ ...prev, spaceHeld: true }))
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setDrawingState((prev) => ({ ...prev, spaceHeld: false }))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || drawingState.spaceHeld) {
      setDrawingState((prev) => ({
        ...prev,
        isPanning: true,
        startX: e.clientX - canvasState.offsetX,
        startY: e.clientY - canvasState.offsetY,
      }))
      return
    }

    if (e.button !== 0) return
    if (toolType === 'select') return

    const canvasPos = screenToCanvas(e.clientX, e.clientY)

    if (toolType === 'text') {
      setTextInput({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        canvasX: canvasPos.x,
        canvasY: canvasPos.y,
      })
      setTimeout(() => textInputRef.current?.focus(), 0)
      return
    }

    setDrawingState((prev) => ({
      ...prev,
      isDrawing: true,
      startX: canvasPos.x,
      startY: canvasPos.y,
      points: [{ x: canvasPos.x, y: canvasPos.y }],
      previewElement: null,
    }))
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingState.isPanning) {
      setCanvasState({
        offsetX: e.clientX - drawingState.startX,
        offsetY: e.clientY - drawingState.startY,
      })
      return
    }

    if (!drawingState.isDrawing) return

    const canvasPos = screenToCanvas(e.clientX, e.clientY)

    switch (toolType) {
      case 'freehand': {
        setDrawingState((prev) => {
          const newPoints = [...prev.points, { x: canvasPos.x, y: canvasPos.y }]
          return {
            ...prev,
            points: newPoints,
            previewElement: {
              id: 'preview',
              createdBy: userName,
              type: 'freehand' as const,
              points: newPoints,
              color: toolConfig.color,
              lineWidth: toolConfig.lineWidth,
            },
          }
        })
        break
      }
      case 'line': {
        setDrawingState((prev) => ({
          ...prev,
          previewElement: {
            id: 'preview',
            createdBy: userName,
            type: 'line' as const,
            start: { x: prev.startX, y: prev.startY },
            end: { x: canvasPos.x, y: canvasPos.y },
            color: toolConfig.color,
            lineWidth: toolConfig.lineWidth,
          },
        }))
        break
      }
      case 'rect': {
        const w = canvasPos.x - drawingState.startX
        const h = canvasPos.y - drawingState.startY
        setDrawingState((prev) => ({
          ...prev,
          previewElement: {
            id: 'preview',
            createdBy: userName,
            type: 'rect' as const,
            x: w >= 0 ? prev.startX : canvasPos.x,
            y: h >= 0 ? prev.startY : canvasPos.y,
            width: Math.abs(w),
            height: Math.abs(h),
            color: toolConfig.color,
            lineWidth: toolConfig.lineWidth,
            fill: toolConfig.fill,
          },
        }))
        break
      }
      case 'circle': {
        const dx = canvasPos.x - drawingState.startX
        const dy = canvasPos.y - drawingState.startY
        const radius = Math.sqrt(dx * dx + dy * dy)
        setDrawingState((prev) => ({
          ...prev,
          previewElement: {
            id: 'preview',
            createdBy: userName,
            type: 'circle' as const,
            cx: prev.startX,
            cy: prev.startY,
            radius,
            color: toolConfig.color,
            lineWidth: toolConfig.lineWidth,
            fill: toolConfig.fill,
          },
        }))
        break
      }
    }
  }

  const handleMouseUp = () => {
    if (drawingState.isPanning) {
      setDrawingState((prev) => ({ ...prev, isPanning: false }))
      return
    }

    if (!drawingState.isDrawing) return

    const preview = drawingState.previewElement
    if (preview) {
      const finalElement = { ...preview, id: generateId() }
      addElement(finalElement)
    }

    setDrawingState({
      isDrawing: false,
      isPanning: false,
      startX: 0,
      startY: 0,
      points: [],
      previewElement: null,
      spaceHeld: false,
    })
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(5, Math.max(0.1, canvasState.scale * delta))

      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const newOffsetX = mouseX - (mouseX - canvasState.offsetX) * (newScale / canvasState.scale)
      const newOffsetY = mouseY - (mouseY - canvasState.offsetY) * (newScale / canvasState.scale)

      setCanvasState({ offsetX: newOffsetX, offsetY: newOffsetY, scale: newScale })
    } else {
      setCanvasState({
        offsetX: canvasState.offsetX - e.deltaX,
        offsetY: canvasState.offsetY - e.deltaY,
      })
    }
  }

  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && textInputRef.current) {
      const content = textInputRef.current.value.trim()
      if (content) {
        addElement({
          id: generateId(),
          createdBy: userName,
          type: 'text',
          x: textInput.canvasX,
          y: textInput.canvasY,
          content,
          fontSize: toolConfig.fontSize,
          color: toolConfig.color,
        })
      }
      setTextInput({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0 })
    }
    if (e.key === 'Escape') {
      setTextInput({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0 })
    }
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      handleMouseDown({
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
      } as React.MouseEvent<HTMLCanvasElement>)
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as React.MouseEvent<HTMLCanvasElement>)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    handleMouseUp()
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${getCursorClass()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {textInput.visible && (
        <input
          ref={textInputRef}
          type="text"
          onKeyDown={handleTextInputKeyDown}
          onBlur={() => setTextInput({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0 })}
          className="absolute z-20 min-w-[120px] px-2 py-1 bg-transparent border-b-2 border-accent text-textPrimary font-dmSans outline-none"
          style={{
            left: textInput.x,
            top: textInput.y,
            fontSize: `${toolConfig.fontSize * canvasState.scale}px`,
          }}
          placeholder="输入文字..."
        />
      )}
    </div>
  )
}
