export interface GameMessage {
  type: string
  gameState?: any
  [key: string]: any
}

export class GameWebSocket {
  private ws: WebSocket | null = null
  private gameId: string
  private messageHandlers: ((message: GameMessage) => void)[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(gameId: string) {
    this.gameId = gameId
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use environment variable or fallback to fly.dev
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://trade-simulation-game.fly.dev"
        const fullUrl = `${wsUrl}/ws/${this.gameId}`

        console.log("Connecting to WebSocket:", fullUrl)

        this.ws = new WebSocket(fullUrl)

        this.ws.onopen = () => {
          console.log("WebSocket connected successfully")
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

        this.ws.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason)
          this.attemptReconnect()
        }

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error)
          reject(error)
        }

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error("WebSocket connection timeout"))
          }
        }, 10000)
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
        this.connect().catch((error) => {
          console.error("Reconnection failed:", error)
        })
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error("Max reconnection attempts reached")
    }
  }

  sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error("WebSocket is not connected")
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
