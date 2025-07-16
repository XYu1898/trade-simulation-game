"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "@/components/ui/use-toast"
import { getWebSocketUrl } from "@/lib/websocket"

interface Player {
  id: string
  name: string
  balance: number
  shares: number
  cash?: number
  cambridgeShares?: number
  totalValue?: number
  isMarketMaker?: boolean
  isMonitor?: boolean
  ordersSubmitted?: number
  isDone?: boolean
  isOnline?: boolean
  rank?: number | null
}

interface Order {
  id: string
  playerId: string
  type: "buy" | "sell"
  price: number
  quantity: number
  round: number
}

interface Trade {
  id: string
  buyerId: string
  sellerId: string
  price: number
  quantity: number
  round: number
}

interface PricePoint {
  day: number
  cambridgeMining: number
  round?: number
  isTradeDay: boolean
}

interface GameState {
  players: Player[]
  orders: Order[]
  trades: Trade[]
  currentPrice: number
  priceHistory: { name: string; value: number }[]
  currentRound: number
  gameStatus: "waiting" | "active" | "finished"
  roundDuration: number
  roundEndTime: number | null
}

const initialGameState: GameState = {
  players: [],
  orders: [],
  trades: [],
  currentPrice: 100,
  priceHistory: [{ name: "Day 1", value: 100 }],
  currentRound: 0,
  gameStatus: "waiting",
  roundDuration: 30,
  roundEndTime: null,
}

export function useGameState(gameId: string) {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const ws = useRef<WebSocket | null>(null)

  const connectWebSocket = useCallback(() => {
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return
    }

    const websocketUrl = getWebSocketUrl(gameId)
    ws.current = new WebSocket(websocketUrl)

    ws.current.onopen = () => {
      console.log("WebSocket connected")
      setIsConnected(true)
      setConnectionError(null)
      // Attempt to re-join if player ID exists in local storage
      const storedPlayerId = localStorage.getItem("currentPlayerId")
      const storedPlayerName = localStorage.getItem("currentPlayerName")
      const storedIsMonitor = localStorage.getItem("isMonitor") === "true"

      if (storedPlayerId && storedPlayerName) {
        joinGame(storedPlayerName, storedIsMonitor, storedPlayerId)
      }
    }

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === "GAME_UPDATE") {
        setGameState(message.gameState)
      }
    }

    ws.current.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason)
      setIsConnected(false)
      setConnectionError("Disconnected from game server. Attempting to reconnect...")
      setTimeout(connectWebSocket, 3000) // Attempt to reconnect after 3 seconds
    }

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error)
      setConnectionError("WebSocket connection error. Please check server status.")
      ws.current?.close() // Close to trigger onclose and reconnect logic
    }
  }, [gameId])

  useEffect(() => {
    connectWebSocket()

    return () => {
      ws.current?.close()
    }
  }, [connectWebSocket])

  const sendMessage = useCallback((type: string, data: any = {}) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, ...data }))
    } else {
      console.warn("WebSocket not open. Message not sent:", type, data)
      toast({
        title: "Connection Error",
        description: "Not connected to the game server. Please refresh.",
        variant: "destructive",
      })
    }
  }, [])

  const joinGame = useCallback(
    (playerName: string, isMonitor: boolean, playerId?: string) => {
      const id = playerId || `player-${Date.now()}`
      setCurrentPlayerId(id)
      localStorage.setItem("currentPlayerId", id)
      localStorage.setItem("currentPlayerName", playerName)
      localStorage.setItem("isMonitor", String(isMonitor))
      sendMessage("PLAYER_JOIN", { playerId: id, playerName, isMonitor })
    },
    [sendMessage],
  )

  const startGame = useCallback(() => {
    if (currentPlayerId) {
      sendMessage("GAME_START", { playerId: currentPlayerId })
    }
  }, [currentPlayerId, sendMessage])

  const submitOrder = useCallback(
    (orderData: { playerId: string; type: "buy" | "sell"; price: number; quantity: number }) => {
      sendMessage("ORDER_SUBMIT", { data: orderData })
    },
    [sendMessage],
  )

  const markDone = useCallback(() => {
    if (currentPlayerId) {
      sendMessage("PLAYER_DONE", { playerId: currentPlayerId })
    }
  }, [currentPlayerId, sendMessage])

  const forceCloseOrders = useCallback(() => {
    if (currentPlayerId) {
      sendMessage("FORCE_CLOSE_ORDERS", { playerId: currentPlayerId })
    }
  }, [currentPlayerId, sendMessage])

  const processRound = useCallback(() => {
    if (currentPlayerId) {
      sendMessage("ROUND_PROCESS", { playerId: currentPlayerId })
    }
  }, [currentPlayerId, sendMessage])

  const nextRound = useCallback(() => {
    if (currentPlayerId) {
      sendMessage("NEXT_ROUND", { playerId: currentPlayerId })
    }
  }, [currentPlayerId, sendMessage])

  const resetGameState = useCallback(() => {
    setGameState(initialGameState)
  }, [])

  return {
    gameState,
    currentPlayerId,
    isConnected,
    connectionError,
    joinGame,
    submitOrder,
    markDone,
    forceCloseOrders,
    startGame,
    processRound,
    nextRound,
    resetGameState,
  }
}
