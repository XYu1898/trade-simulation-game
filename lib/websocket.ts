"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface WebSocketMessage {
  type: string
  payload: any
}

export function useWebSocket(gameId: string | null, playerId: string | null) {
  const ws = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null)

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host
    return `${protocol}//${host}/ws/${gameId}`
  }, [gameId])

  useEffect(() => {
    if (!gameId || !playerId) {
      if (ws.current) {
        ws.current.close()
        ws.current = null
      }
      setIsConnected(false)
      return
    }

    const url = getWebSocketUrl()
    console.log(`Attempting to connect to WebSocket: ${url}`)

    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      console.log("WebSocket connected")
      setIsConnected(true)
      // Send player ID upon connection if it's a reconnection
      if (playerId) {
        sendMessage(JSON.stringify({ type: "reconnect", payload: { gameId, playerId } }))
      }
    }

    ws.current.onmessage = (event) => {
      setLastMessage(event)
    }

    ws.current.onclose = () => {
      console.log("WebSocket disconnected")
      setIsConnected(false)
      // Implement reconnection logic if needed
    }

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error)
      setIsConnected(false)
    }

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [gameId, playerId, getWebSocketUrl])

  const sendMessage = useCallback((message: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message)
    } else {
      console.warn("WebSocket is not open. Message not sent:", message)
    }
  }, [])

  return { sendMessage, lastMessage, isConnected }
}
