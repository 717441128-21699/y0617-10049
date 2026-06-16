import { create } from 'zustand'
import type { ToolType, ToolConfig, CanvasState } from '../../shared/types'

interface WhiteboardState {
  toolType: ToolType
  toolConfig: ToolConfig
  canvasState: CanvasState
  setToolType: (toolType: ToolType) => void
  setToolConfig: (config: Partial<ToolConfig>) => void
  setCanvasState: (state: Partial<CanvasState>) => void
  resetCanvas: () => void
}

export const useWhiteboardStore = create<WhiteboardState>((set) => ({
  toolType: 'freehand',
  toolConfig: {
    color: '#00e5a0',
    lineWidth: 2,
    fontSize: 16,
    fill: 'transparent',
  },
  canvasState: {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
  setToolType: (toolType) => set({ toolType }),
  setToolConfig: (config) =>
    set((state) => ({
      toolConfig: { ...state.toolConfig, ...config },
    })),
  setCanvasState: (canvasState) =>
    set((state) => ({
      canvasState: { ...state.canvasState, ...canvasState },
    })),
  resetCanvas: () =>
    set({
      canvasState: { offsetX: 0, offsetY: 0, scale: 1 },
    }),
}))
