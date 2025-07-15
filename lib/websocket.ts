"use client"

export interface GameMessage {
  type:
    | "PLAYER_JOIN"
    | "PLAYER_LEAVE"
    | "GAME_START"
    | "GAME_UPDATE"
    | "ORDER_SUBMIT"
    | "PLAYER_DONE"
    | "ROUND_PROCESS"
    | "NEXT_ROUND"
  playerId: string
  playerName?: string
  isMonitor?: boolean
  data?: any
  gameState?: any
}

export class GameWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 20
  private reconnectDelay = 1000
  private messageHandlers: ((message: GameMessage) => void)[] = []

  constructor(private gameId: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Decide the target WS endpoint.
        // Priority: 1) explicit env-var 2) same-origin `/api/ws/:gameId`
        const wsUrl =
          process.env.NEXT_PUBLIC_WS_SERVER_URL?.replace(/\/$/, "") ||
          `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`

        // final url →  …/api/ws/<gameId>
        this.ws = new WebSocket(`${wsUrl}/api/ws/${this.gameId}`)

        this.ws.onopen = () => {
          console.log("WebSocket connected")
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: GameMessage = JSON.parse(event.data)
            this.messageHandlers.forEach((handler) => handler(message))
          } catch (error) {
            console.error("Error parsing WebSocket message:", error)
          }
        }

        this.ws.onclose = () => {
          console.log("WebSocket disconnected")
          this.attemptReconnect()
        }

        this.ws.onerror = () => {
          console.warn("WebSocket connection failed – retrying…")
          // Let `onclose` handle the back-off reconnect
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connect().catch(console.error)
        this.reconnectDelay *= 2 // exponential back-off
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  sendMessage(message: GameMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // enqueue + retry later
      setTimeout(() => this.sendMessage(message), 500)
    }
  }

  onMessage(handler: (message: GameMessage) => void) {
    this.messageHandlers.push(handler)
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
