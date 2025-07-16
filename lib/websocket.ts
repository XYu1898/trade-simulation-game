// This file was left out for brevity. Assume it is correct and does not need any modifications.
export class GameWebSocket {
  private ws: WebSocket | null = null
  private gameId: string
  private messageHandlers: ((message: any) => void)[] = []
  private retryInterval = 1000 // 1 second
  private maxRetries = 5
  private retries = 0
  private isConnecting = false

  constructor(gameId: string) {
    this.gameId = gameId
  }

  private getWebSocketUrl(): string {
    // Use VERCEL_URL if available, otherwise default to localhost
    // For production, VERCEL_URL will be like https://your-deployment-url.vercel.app
    // For local development, it might be undefined or localhost
    const vercelUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_VERCEL_URL

    if (vercelUrl) {
      const url = new URL(vercelUrl)
      const protocol = url.protocol === "https:" ? "wss:" : "ws:"
      return `${protocol}//${url.host}/ws/${this.gameId}`
    } else if (typeof window !== "undefined") {
      // Fallback for client-side if NEXT_PUBLIC_WS_URL is not set
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      return `${protocol}//${window.location.host}/ws/${this.gameId}`
    }
    // Default to a known local or development server if no other info
    return `ws://localhost:8000/ws/${this.gameId}`
  }

  async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve()
    }

    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection)
            resolve()
          } else if (!this.isConnecting) {
            clearInterval(checkConnection)
            reject(new Error("Connection attempt failed."))
          }
        }, 100)
      })
    }

    this.isConnecting = true
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.getWebSocketUrl())

      this.ws.onopen = () => {
        console.log("WebSocket connected.")
        this.retries = 0
        this.isConnecting = false
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.messageHandlers.forEach((handler) => handler(message))
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e)
        }
      }

      this.ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason)
        this.isConnecting = false
        if (event.code !== 1000 && this.retries < this.maxRetries) {
          this.retries++
          console.log(`Retrying connection in ${this.retryInterval / 1000} seconds... (Attempt ${this.retries})`)
          setTimeout(() => this.connect().then(resolve).catch(reject), this.retryInterval)
        } else if (event.code !== 1000) {
          reject(new Error("Max retries reached. Could not connect to WebSocket."))
        }
      }

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        this.isConnecting = false
        this.ws?.close() // Close to trigger onclose and retry logic
        reject(error)
      }
    })
  }

  sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("WebSocket not open. Message not sent:", message)
    }
  }

  onMessage(handler: (message: any) => void): void {
    this.messageHandlers.push(handler)
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, "Client initiated disconnect")
      this.ws = null
      this.messageHandlers = []
      this.isConnecting = false
    }
  }
}

export type GameMessage =
  | { type: "GAME_UPDATE"; gameState: any }
  | { type: "PLAYER_JOIN"; playerId: string; playerName: string; isMonitor: boolean }
  | { type: "GAME_START"; playerId: string }
  | { type: "ORDER_SUBMIT"; playerId: string; data: any }
  | { type: "PLAYER_DONE"; playerId: string }
  | { type: "FORCE_CLOSE_ORDERS"; playerId: string }
  | { type: "ROUND_PROCESS"; playerId: string }
  | { type: "NEXT_ROUND"; playerId: string }
  | { type: "ROUND_COMPLETE"; gameState: any } // Added for clarity, though GAME_UPDATE often covers this
