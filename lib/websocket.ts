export type GameMessage =
  | { type: "GAME_UPDATE"; gameState: any }
  | { type: "PLAYER_JOIN"; playerId: string; playerName: string; isMonitor: boolean }
  | { type: "GAME_START"; playerId: string }
  | { type: "ORDER_SUBMIT"; playerId: string; data: any }
  | { type: "PLAYER_DONE"; playerId: string }
  | { type: "FORCE_CLOSE_ORDERS"; playerId: string }
  | { type: "ROUND_PROCESS"; playerId: string }
  | { type: "NEXT_ROUND"; playerId: string }
  | { type: "ROUND_COMPLETE"; gameState: any }

export function getWebSocketUrl(gameId: string): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return `${process.env.NEXT_PUBLIC_WS_URL}/${gameId}`
  }

  // Dynamically derive WebSocket URL from current origin
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const hostname = window.location.hostname
  const port = process.env.NODE_ENV === "development" ? ":8000" : "" // Backend runs on 8000 in dev
  return `${protocol}//${hostname}${port}/ws/${gameId}`
}

export class GameWebSocket {
  private ws: WebSocket | null = null
  private messageHandlers: ((message: GameMessage) => void)[] = []
  private gameId: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectInterval = 1000 // 1 second

  constructor(gameId: string) {
    this.gameId = gameId
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        resolve()
        return
      }

      const url = getWebSocketUrl(this.gameId)
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log("WebSocket connected")
        this.reconnectAttempts = 0 // Reset reconnect attempts on successful connection
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: GameMessage = JSON.parse(event.data)
          this.messageHandlers.forEach((handler) => handler(message))
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error)
        }
      }

      this.ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason)
        this.handleReconnect()
      }

      this.ws.onerror = (event) => {
        console.error("WebSocket error:", event)
        this.ws?.close() // Force close to trigger onclose and reconnect logic
        reject(new Error("WebSocket connection error"))
      }
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      setTimeout(() => this.connect().catch(() => {}), this.reconnectInterval) // Catch to prevent unhandled promise rejection
    } else {
      console.error("Max reconnect attempts reached. Connection failed permanently.")
      // Optionally, notify the UI about permanent disconnection
    }
  }

  sendMessage(message: GameMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("WebSocket not open. Message not sent:", message)
      // Attempt to reconnect if not open
      this.connect().then(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(message))
        }
      })
    }
  }

  onMessage(handler: (message: GameMessage) => void) {
    this.messageHandlers.push(handler)
  }

  offMessage(handler: (message: GameMessage) => void) {
    this.messageHandlers = this.messageHandlers.filter((h) => h !== handler)
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
