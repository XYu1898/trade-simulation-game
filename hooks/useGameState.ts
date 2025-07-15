"use client"

import { useState, useEffect, useCallback } from "react"
import { GameWebSocket, type GameMessage } from "../lib/websocket"

interface PricePoint {
  day: number
  round?: number
  cambridgeMining: number
  oxfordWater: number
  isTradeDay?: boolean
}

interface Order {
  id: string
  playerId: string
  playerName: string
  stock: "CAMB" | "OXFD"
  type: "BUY" | "SELL"
  price: number
  quantity: number
  round: number
  status: "PENDING" | "FILLED" | "PARTIAL"
  filledQuantity?: number
}

interface Trade {
  id: string
  stock: "CAMB" | "OXFD"
  price: number
  quantity: number
  buyerId: string
  sellerId: string
  round: number
}

interface Player {
  id: string
  name: string
  cash: number
  cambridgeShares: number
  oxfordShares: number
  totalValue: number
  rank?: number
  isMarketMaker?: boolean
  isMonitor?: boolean
  ordersSubmitted?: number
  isDone?: boolean
  isOnline?: boolean
}

interface GameState {
  currentRound: number
  phase: "LOBBY" | "SETUP" | "TRADING" | "PROCESSING" | "RESULTS" | "FINISHED"
  players: Player[]
  orders: Order[]
  trades: Trade[]
  priceHistory: PricePoint[]
  currentPrices: { CAMB: number; OXFD: number }
  gameStarted: boolean
}

export function useGameState(gameId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentPlayerId, setCurrentPlayerId] = useState<string>("")
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string>("")
  const [gameSocket, setGameSocket] = useState<GameWebSocket | null>(null)

  // Initialize WebSocket connection
  useEffect(() => {
    const socket = new GameWebSocket(gameId)
    setGameSocket(socket)

    socket
      .connect()
      .then(() => {
        setIsConnected(true)
        setConnectionError("")
      })
      .catch((error) => {
        setConnectionError("Failed to connect to game server")
        console.error("WebSocket connection failed:", error)
      })

    // Handle incoming messages
    socket.onMessage((message: GameMessage) => {
      switch (message.type) {
        case "GAME_UPDATE":
          setGameState(message.gameState)
          break
        case "PLAYER_JOIN":
          // Game state will be updated via GAME_UPDATE message
          break
        default:
          console.log("Received message:", message)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [gameId])

  const joinGame = useCallback(
    (playerName: string, isMonitor = false) => {
      if (!gameSocket || !isConnected) {
        console.error("Not connected to game server")
        return
      }

      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setCurrentPlayerId(playerId)

      gameSocket.sendMessage({
        type: "PLAYER_JOIN",
        playerId,
        playerName,
        isMonitor,
      })
    },
    [gameSocket, isConnected],
  )

  const submitOrder = useCallback(
    (order: Omit<Order, "id" | "round" | "status">) => {
      if (!gameSocket || !isConnected || !currentPlayerId) return

      gameSocket.sendMessage({
        type: "ORDER_SUBMIT",
        playerId: currentPlayerId,
        data: order,
      })
    },
    [gameSocket, isConnected, currentPlayerId],
  )

  const markDone = useCallback(() => {
    if (!gameSocket || !isConnected || !currentPlayerId) return

    gameSocket.sendMessage({
      type: "PLAYER_DONE",
      playerId: currentPlayerId,
    })
  }, [gameSocket, isConnected, currentPlayerId])

  const startGame = useCallback(() => {
    if (!gameSocket || !isConnected || !currentPlayerId) return

    gameSocket.sendMessage({
      type: "GAME_START",
      playerId: currentPlayerId,
    })
  }, [gameSocket, isConnected, currentPlayerId])

  const processRound = useCallback(() => {
    if (!gameSocket || !isConnected || !currentPlayerId) return

    gameSocket.sendMessage({
      type: "ROUND_PROCESS",
      playerId: currentPlayerId,
    })
  }, [gameSocket, isConnected, currentPlayerId])

  const nextRound = useCallback(() => {
    if (!gameSocket || !isConnected || !currentPlayerId) return

    gameSocket.sendMessage({
      type: "NEXT_ROUND",
      playerId: currentPlayerId,
    })
  }, [gameSocket, isConnected, currentPlayerId])

  return {
    gameState,
    currentPlayerId,
    isConnected,
    connectionError,
    joinGame,
    submitOrder,
    markDone,
    startGame,
    processRound,
    nextRound,
  }
}
