"use client"

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
  private isConnecting = false

  constructor(gameId: string) {
    this.gameId = gameId
  }

  private getWebSocketUrl(): string {
    // Use NEXT_PUBLIC_WS_URL if available, otherwise fallback to current origin or fly.dev
    const wsUrlEnv = process.env.NEXT_PUBLIC_WS_URL
    const vercelUrlEnv = process.env.NEXT_PUBLIC_VERCEL_URL

    let baseUrl: string

    if (wsUrlEnv) {
      baseUrl = wsUrlEnv
    } else if (vercelUrlEnv) {
      // For Vercel deployments, construct WebSocket URL from VERCEL_URL
      const url = new URL(vercelUrlEnv)
      const protocol = url.protocol === "https:" ? "wss:" : "ws:"
      baseUrl = `${protocol}//${url.host}`
    } else if (typeof window !== "undefined") {
      // Fallback for client-side if no environment variables are set
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      baseUrl = `${protocol}//${window.location.host}`
    } else {
      // Default to a known local or development server if no other info
      baseUrl = `ws://localhost:8000`
    }

    return `${baseUrl}/ws/${this.gameId}`
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
        console.log("WebSocket connected successfully")
        this.reconnectAttempts = 0
        this.isConnecting = false
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
        console.log("WebSocket disconnected:", event.code, event.reason)
        this.isConnecting = false
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
          setTimeout(() => {
            this.connect()
              .then(resolve)
              .catch((err) => {
                // Only reject if max attempts reached or a critical error
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                  reject(err)
                }
              })
          }, this.reconnectDelay * this.reconnectAttempts) // Exponential backoff
        } else if (event.code !== 1000) {
          reject(new Error("Max reconnection attempts reached or connection closed unexpectedly."))
        }
      }

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        this.isConnecting = false
        this.ws?.close() // Close to trigger onclose and retry logic
        reject(error)
      }

      // Connection timeout
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.ws?.close() // Close to trigger onclose and retry logic
          reject(new Error("WebSocket connection timeout"))
        }
      }, 10000)
    })
  }

  sendMessage(message: GameMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("Sending message:", message.type)
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("WebSocket not connected, message not sent:", message.type)
    }
  }

  onMessage(handler: (message: GameMessage) => void) {
    this.messageHandlers.push(handler)
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, "Client initiated disconnect")
      this.ws = null
      this.messageHandlers = []
      this.isConnecting = false
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
