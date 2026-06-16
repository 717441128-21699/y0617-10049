export interface FreehandElement {
  id: string;
  createdBy: string;
  type: "freehand";
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
}

export interface LineElement {
  id: string;
  createdBy: string;
  type: "line";
  start: { x: number; y: number };
  end: { x: number; y: number };
  color: string;
  lineWidth: number;
}

export interface RectElement {
  id: string;
  createdBy: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  lineWidth: number;
  fill: string;
}

export interface CircleElement {
  id: string;
  createdBy: string;
  type: "circle";
  cx: number;
  cy: number;
  radius: number;
  color: string;
  lineWidth: number;
  fill: string;
}

export interface TextElement {
  id: string;
  createdBy: string;
  type: "text";
  x: number;
  y: number;
  content: string;
  fontSize: number;
  color: string;
}

export type DrawingElement =
  | FreehandElement
  | LineElement
  | RectElement
  | CircleElement
  | TextElement;

export type ToolType =
  | "select"
  | "freehand"
  | "line"
  | "rect"
  | "circle"
  | "text";

export interface RoomInfo {
  roomId: string;
  name: string;
  hasPassword: boolean;
  userCount: number;
}

export interface CreateRoomRequest {
  name: string;
  password?: string;
}

export interface VerifyRoomRequest {
  password: string;
}

export type WSClientMessage =
  | { type: "join"; roomId: string; token: string; userName: string }
  | { type: "sync"; roomId: string; update: number[] }
  | { type: "cursor"; roomId: string; x: number; y: number };

export type WSServerMessage =
  | { type: "welcome"; users: OnlineUser[] }
  | { type: "sync"; update: number[]; sourceClientId: string }
  | { type: "cursor"; userId: string; x: number; y: number }
  | { type: "user-joined"; user: OnlineUser }
  | { type: "user-left"; userId: string };

export interface OnlineUser {
  id: string;
  name: string;
  color: string;
}

export interface CanvasState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface ToolConfig {
  color: string;
  lineWidth: number;
  fontSize: number;
  fill: string;
}
