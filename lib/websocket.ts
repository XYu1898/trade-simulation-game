// lib/websocket.ts
/**
 * Thin wrapper around a browser WebSocket with automatic URL resolution and
 * simple reconnect logic.
 *
 *  • Uses NEXT_PUBLIC_WS_URL if present – ex: wss://api.example.com
 *  • Otherwise falls back to the current origin (supporting dev + prod)
 *  • Automatically appends `/ws/${gameId}`
 */

export interface GameMessage {
  type: string
  gameState?: any
  [key: string]: any
}

function buildWebSocketUrl(gameId: string): string {
  // 1. Prefer explicit environment variable
  const env = (process.env.NEXT_PUBLIC_WS_URL || "").trim().replace(/\/$/, "")
  if (env) return `${env}/ws/${gameId}`

  // 2. Fallback to current location (handles v0 preview & localhost)
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const host = window.location.host
  return `${protocol}//${host}/ws/${gameId}`
}

export class GameWebSocket {
  private ws: WebSocket | null = null
  private readonly gameId: string
  private handlers: Array<(m: GameMessage) => void> = []

  /* ----------  Re-connect state  ---------- */
  private reconnects = 0
  private readonly maxReconnects = 5
  private readonly reconnectDelay = 1_000 // ms

  constructor(gameId: string) {
    this.gameId = gameId
  }

  /* ----------  Public API  ---------- */

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = buildWebSocketUrl(this.gameId)
      console.info("[WS] Connecting →", url)

      this.ws = new WebSocket(url)

      /* ----- lifecycle ----- */
      this.ws.onopen = () => {
        console.info("[WS] ✔ connected")
        this.reconnects = 0
        resolve()
      }

      this.ws.onmessage = (evt) => {
        try {
          const msg: GameMessage = JSON.parse(evt.data)
          this.handlers.forEach((h) => h(msg))
        } catch (err) {
          console.error("[WS] failed to parse message", err)
        }
      }

      this.ws.onerror = (evt) => {
        console.error("[WS] socket error", evt)
        // close() triggers onclose → attemptReconnect()
        this.ws?.close()
      }

      this.ws.onclose = (evt) => {
        console.warn("[WS] closed:", evt.code, evt.reason)
        this.attemptReconnect(reject)
      }

      /* ----- 10 s connection timeout ----- */
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          console.error("[WS] connection timeout")
          this.ws?.close()
          reject(new Error("WebSocket connection timeout"))
        }
      }, 10_000)
    })
  }

  sendMessage(message: GameMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("[WS] send failed – socket not open", message)
    }
  }

  onMessage(handler: (m: GameMessage) => void) {
    this.handlers.push(handler)
  }

  disconnect() {
    this.reconnects = this.maxReconnects // stop reconnect loop
    this.ws?.close()
    this.ws = null
  }

  /* ----------  Private helpers  ---------- */

  private attemptReconnect(initialReject: (err?: any) => void) {
    if (this.reconnects >= this.maxReconnects) {
      console.error("[WS] ❌ maximum reconnect attempts reached")
      initialReject(new Error("Maximum reconnect attempts reached"))
      return
    }

    this.reconnects++
    const delay = this.reconnectDelay * this.reconnects
    console.info(`[WS] retrying in ${delay} ms…  (${this.reconnects}/${this.maxReconnects})`)

    setTimeout(() => {
      this.connect().catch((err) => {
        // keep bubbling errors so they don’t get swallowed
        console.error("[WS] reconnect failed", err)
      })
    }, delay)
  }
}
