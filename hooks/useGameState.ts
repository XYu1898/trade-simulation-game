"use client"

import { useState, useEffect, useCallback } from "react"
import { GameWebSocket, type GameMessage } from "../lib/websocket"

interface PricePoint {
  day: number
  round?: number
  cambridgeMining: number
  isTradeDay?: boolean
}

interface Order {
  id: string
  playerId: string
  playerName: string
  stock: "CAMB"
  type: "BUY" | "SELL"
  price: number
  quantity: number
  round: number
  status: "PENDING" | "FILLED" | "PARTIAL"
  filledQuantity?: number
}

interface Trade {
  id: string
  stock: "CAMB"
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
  totalValue: number
  rank?: number
  isMarketMaker?: boolean
  isMonitor?: boolean
  ordersSubmitted?: number
  isDone?: boolean
  isOnline?: boolean
}

interface ConsolidatedOrders {
  BUY: { [price: number]: number }
  SELL: { [price: number]: number }
}

interface GameState {
  currentRound: number
  phase: "LOBBY" | "SETUP" | "TRADING" | "PROCESSING" | "RESULTS" | "FINISHED"
  players: Player[]
  orders: Order[]
  consolidatedOrders: ConsolidatedOrders
  trades: Trade[]
  priceHistory: PricePoint[]
  currentPrices: { CAMB: number }
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
        console.log("Successfully connected to game server")
      })
      .catch((error) => {
        setConnectionError("Failed to connect to game server. Please check your internet connection.")
        setIsConnected(false)
        console.error("WebSocket connection failed:", error)
      })

    // Handle incoming messages
    socket.onMessage((message: GameMessage) => {
      console.log("Processing message:", message.type)

      switch (message.type) {
        case "GAME_UPDATE":
          console.log("Updating game state:", message.gameState)
          setGameState(message.gameState)
          break
        case "ROUND_COMPLETE":
          console.log("Round completed, updating state")
          setGameState(message.gameState)
          break
        default:
          console.log("Unhandled message type:", message.type)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [gameId])

  const joinGame = useCallback(
    (playerName: string, isMonitor = false) => {
      if (!gameSocket || !isConnected) {
        console.error("Cannot join game: not connected to server")
        return
      }

      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setCurrentPlayerId(playerId)

      console.log("Joining game as:", { playerId, playerName, isMonitor })

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
      if (!gameSocket || !isConnected || !currentPlayerId) {
        console.error("Cannot submit order: not connected")
        return
      }

      console.log("Submitting order:", order)

      gameSocket.sendMessage({
        type: "ORDER_SUBMIT",
        playerId: currentPlayerId,
        data: order,
      })
    },
    [gameSocket, isConnected, currentPlayerId],
  )

  const markDone = useCallback(() => {
    if (!gameSocket || !isConnected || !currentPlayerId) {
      console.error("Cannot mark done: not connected")
      return
    }

    console.log("Marking player done:", currentPlayerId)

    gameSocket.sendMessage({
      type: "PLAYER_DONE",
      playerId: currentPlayerId,
    })
  }, [gameSocket, isConnected, currentPlayerId])

  const forceCloseOrders = useCallback(() => {
    if (!gameSocket || !isConnected || !currentPlayerId) {
      console.error("Cannot force close orders: not connected")
      return
    }

    console.log("Force closing orders")

    gameSocket.sendMessage({
      type: "FORCE_CLOSE_ORDERS",
      playerId: currentPlayerId,
    })
  }, [gameSocket, isConnected, currentPlayerId])

  const startGame = useCallback(() => {
    if (!gameSocket || !isConnected || !currentPlayerId) {
      console.error("Cannot start game: not connected")
      return
    }

    console.log("Starting game")

    gameSocket.sendMessage({
      type: "GAME_START",
      playerId: currentPlayerId,
    })
  }, [gameSocket, isConnected, currentPlayerId])

  const startTrading = useCallback(() => {
    if (!gameSocket || !isConnected || !currentPlayerId) {
      console.error("Cannot start trading: not connected")
      return
    }

    console.log("Starting trading")

    gameSocket.sendMessage({
      type: "START_TRADING",
      playerId: currentPlayerId,
    })
  }, [gameSocket, isConnected, currentPlayerId])

  const processRound = useCallback(() => {
    if (!gameSocket || !isConnected || !currentPlayerId) {
      console.error("Cannot process round: not connected")
      return
    }

    console.log("Processing round")

    gameSocket.sendMessage({
      type: "ROUND_PROCESS",
      playerId: currentPlayerId,
    })
  }, [gameSocket, isConnected, currentPlayerId])

  const nextRound = useCallback(() => {
    if (!gameSocket || !isConnected || !currentPlayerId) {
      console.error("Cannot go to next round: not connected")
      return
    }

    console.log("Going to next round")

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
    forceCloseOrders,
    startGame,
    startTrading,
    processRound,
    nextRound,
  }
}
