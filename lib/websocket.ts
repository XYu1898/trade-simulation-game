"use client"

export type GameMessage =
  | { type: "PLAYER_JOIN"; playerId: string; playerName: string; isMonitor: boolean }
  | { type: "GAME_START"; playerId: string }
  | { type: "ORDER_SUBMIT"; playerId: string; data: any }
  | { type: "PLAYER_DONE"; playerId: string }
  | { type: "FORCE_CLOSE_ORDERS"; playerId: string }
  | { type: "ROUND_PROCESS"; playerId: string }
  | { type: "NEXT_ROUND"; playerId: string }
  | { type: "GAME_UPDATE"; gameState: any }
  | { type: "ROUND_COMPLETE"; gameState: any }

export class GameWebSocket {
  private ws: WebSocket | null = null
  private gameId: string
  private messageHandlers: ((message: GameMessage) => void)[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelayMs = 1000

  constructor(gameId: string) {
    this.gameId = gameId
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Pick WS URL:
      // 1. If the user provided NEXT_PUBLIC_WS_URL we trust it.
      // 2. Otherwise build it from the current origin so previews work.
      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL && process.env.NEXT_PUBLIC_WS_URL.trim().length > 0
          ? `${process.env.NEXT_PUBLIC_WS_URL}/ws/${this.gameId}`
          : (() => {
              // location is always available in the browser at runtime
              const { protocol, host } = window.location
              // Switch http → ws   |  https → wss
              const wsProtocol = protocol === "https:" ? "wss:" : "ws:"
              return `${wsProtocol}//${host}/ws/${this.gameId}`
            })()

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log("WebSocket connected.")
        this.reconnectAttempts = 0 // Reset reconnect attempts on successful connection
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: GameMessage = JSON.parse(event.data as string)
          this.messageHandlers.forEach((handler) => handler(message))
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error)
        }
      }

      this.ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason)
        this.attemptReconnect()
      }

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        this.ws?.close() // Force close to trigger onclose and reconnect logic
        reject(error)
      }
    })
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff
      console.log(`Attempting to reconnect in ${delay / 1000} seconds... (Attempt ${this.reconnectAttempts})`)
      setTimeout(() => {
        this.connect().catch((e) => console.error("Reconnect failed:", e))
      }, delay)
    } else {
      console.error("Max reconnect attempts reached. Please refresh the page.")
      // Optionally, notify the user via UI that connection is lost permanently
    }
  }

  public sendMessage(message: GameMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("WebSocket not connected. Message not sent:", message)
    }
  }

  public onMessage(handler: (message: GameMessage) => void): void {
    this.messageHandlers.push(handler)
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.onclose = null // Prevent reconnect attempt on intentional disconnect
      this.ws.close()
      this.ws = null
      console.log("WebSocket intentionally disconnected.")
    }
  }
}
