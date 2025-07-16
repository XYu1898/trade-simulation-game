"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Chart } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OrderBookDisplay } from "./order-book-display"
import { useToast } from "@/components/ui/use-toast"
import { useWebSocket } from "@/lib/websocket"
import { useGameState } from "@/hooks/useGameState"
import { useState, useEffect, useCallback } from "react"

interface Player {
  id: string
  name: string
  balance: number
  shares: number
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

export default function TradingGame() {
  const [playerName, setPlayerName] = useState("")
  const [gameId, setGameId] = useState("")
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy")
  const [orderPrice, setOrderPrice] = useState<number>(0)
  const [orderQuantity, setOrderQuantity] = useState<number>(0)
  const { toast } = useToast()

  const { sendMessage, lastMessage, isConnected } = useWebSocket(gameId, playerId)
  const { gameState, setGameState, resetGameState } = useGameState()

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data)
        if (data.type === "game_state") {
          setGameState(data.payload)
        } else if (data.type === "player_id") {
          setPlayerId(data.payload.playerId)
          toast({
            title: "Joined Game",
            description: `You are player ${data.payload.playerId}`,
          })
        } else if (data.type === "error") {
          toast({
            title: "Error",
            description: data.payload.message,
            variant: "destructive",
          })
        } else if (data.type === "notification") {
          toast({
            title: "Notification",
            description: data.payload.message,
          })
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error)
      }
    }
  }, [lastMessage, setGameState, toast])

  const handleCreateGame = useCallback(() => {
    if (!playerName) {
      toast({
        title: "Error",
        description: "Please enter your name to create a game.",
        variant: "destructive",
      })
      return
    }
    const newGameId = Math.random().toString(36).substring(2, 8)
    setGameId(newGameId)
    sendMessage(JSON.stringify({ type: "create_game", payload: { gameId: newGameId, playerName } }))
    resetGameState() // Reset game state when creating a new game
  }, [playerName, sendMessage, resetGameState, toast])

  const handleJoinGame = useCallback(() => {
    if (!playerName || !gameId) {
      toast({
        title: "Error",
        description: "Please enter your name and Game ID to join a game.",
        variant: "destructive",
      })
      return
    }
    sendMessage(JSON.stringify({ type: "join_game", payload: { gameId, playerName } }))
  }, [playerName, gameId, sendMessage, toast])

  const handleStartGame = useCallback(() => {
    if (gameId && playerId) {
      sendMessage(JSON.stringify({ type: "start_game", payload: { gameId, playerId } }))
    }
  }, [gameId, playerId, sendMessage])

  const handleSubmitOrder = useCallback(() => {
    if (gameId && playerId && orderPrice > 0 && orderQuantity > 0) {
      sendMessage(
        JSON.stringify({
          type: "submit_order",
          payload: {
            gameId,
            playerId, // Include playerId here
            orderType,
            price: orderPrice,
            quantity: orderQuantity,
          },
        }),
      )
      setOrderPrice(0)
      setOrderQuantity(0)
    } else {
      toast({
        title: "Error",
        description: "Please enter a valid price and quantity for your order.",
        variant: "destructive",
      })
    }
  }, [gameId, playerId, orderType, orderPrice, orderQuantity, sendMessage, toast])

  const handleEndRound = useCallback(() => {
    if (gameId && playerId) {
      sendMessage(JSON.stringify({ type: "end_round", payload: { gameId, playerId } }))
    }
  }, [gameId, playerId, sendMessage])

  const currentPlayer = gameState?.players?.find((p) => p.id === playerId)

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow rounded-lg mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Trading Simulation</h1>
        <div className="flex items-center space-x-4">
          <span className="text-gray-700 dark:text-gray-300">Status: {isConnected ? "Connected" : "Disconnected"}</span>
          {playerId && <span className="text-gray-700 dark:text-gray-300">Player ID: {playerId}</span>}
          {gameId && <span className="text-gray-700 dark:text-gray-300">Game ID: {gameId}</span>}
        </div>
      </header>

      {!playerId ? (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Join or Create Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Enter your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
            <div className="flex space-x-2">
              <Button onClick={handleCreateGame} className="flex-1">
                Create New Game
              </Button>
            </div>
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-700" />
              <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400">OR</span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-700" />
            </div>
            <Input placeholder="Enter Game ID to Join" value={gameId} onChange={(e) => setGameId(e.target.value)} />
            <Button onClick={handleJoinGame} className="w-full">
              Join Game
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Game State</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current Round</p>
                  <p className="text-lg font-semibold">{gameState?.currentRound}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current Price</p>
                  <p className="text-lg font-semibold">{gameState?.currentPrice}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Game Status</p>
                  <p className="text-lg font-semibold">{gameState?.gameStatus}</p>
                </div>
                {gameState?.roundEndTime && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Round Ends In</p>
                    <p className="text-lg font-semibold">
                      {Math.max(0, Math.ceil((gameState.roundEndTime - Date.now()) / 1000))}s
                    </p>
                  </div>
                )}
                <div className="col-span-2">
                  {gameState?.gameStatus === "waiting" && (
                    <Button onClick={handleStartGame} className="w-full">
                      Start Game
                    </Button>
                  )}
                  {gameState?.gameStatus === "active" && (
                    <Button onClick={handleEndRound} className="w-full bg-transparent" variant="outline">
                      End Round
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Place Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Button
                    variant={orderType === "buy" ? "default" : "outline"}
                    onClick={() => setOrderType("buy")}
                    className="flex-1"
                  >
                    Buy
                  </Button>
                  <Button
                    variant={orderType === "sell" ? "default" : "outline"}
                    onClick={() => setOrderType("sell")}
                    className="flex-1"
                  >
                    Sell
                  </Button>
                </div>
                <Input
                  type="number"
                  placeholder="Price"
                  value={orderPrice === 0 ? "" : orderPrice}
                  onChange={(e) => setOrderPrice(Number.parseInt(e.target.value) || 0)}
                />
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={orderQuantity === 0 ? "" : orderQuantity}
                  onChange={(e) => setOrderQuantity(Number.parseInt(e.target.value) || 0)}
                />
                <Button onClick={handleSubmitOrder} className="w-full">
                  Submit Order
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Cambridge Mining</TableCell>
                      <TableCell>{currentPlayer?.shares ?? 0}</TableCell>
                      <TableCell>${currentPlayer?.balance ?? 0}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <OrderBookDisplay orders={gameState?.orders || []} currentRound={gameState?.currentRound || 0} />

            <Card>
              <CardHeader>
                <CardTitle>Price History</CardTitle>
              </CardHeader>
              <CardContent>
                <Chart
                  data={gameState?.priceHistory || []}
                  title="Cambridge Mining Price Over Time"
                  description="Historical price movements of Cambridge Mining shares."
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Players</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Shares</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gameState?.players?.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>{player.name}</TableCell>
                        <TableCell>${player.balance}</TableCell>
                        <TableCell>{player.shares}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gameState?.trades?.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell>{gameState.players.find((p) => p.id === trade.buyerId)?.name || "N/A"}</TableCell>
                        <TableCell>{gameState.players.find((p) => p.id === trade.sellerId)?.name || "N/A"}</TableCell>
                        <TableCell>${trade.price}</TableCell>
                        <TableCell>{trade.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
