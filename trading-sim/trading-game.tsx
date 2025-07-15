"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Trophy, Clock, BookOpen, Users, Monitor } from "lucide-react"

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

// Renders a red dot on trade days, otherwise nothing
function TradeDot(props: any) {
  if (props.payload?.isTradeDay) {
    return <circle cx={props.cx} cy={props.cy} r={4} fill="red" />
  }
  return null
}

// Generate synthetic price history for 10 days
const generatePriceHistory = (): PricePoint[] => {
  const history: PricePoint[] = []
  let cambPrice = 50 + Math.random() * 20 // Start between $50-70
  let oxfordPrice = 30 + Math.random() * 15 // Start between $30-45

  for (let day = 1; day <= 10; day++) {
    // Add some volatility
    cambPrice += (Math.random() - 0.5) * 4
    oxfordPrice += (Math.random() - 0.5) * 3

    // Keep prices reasonable
    cambPrice = Math.max(20, Math.min(100, cambPrice))
    oxfordPrice = Math.max(15, Math.min(60, oxfordPrice))

    history.push({
      day,
      cambridgeMining: Number(cambPrice.toFixed(2)),
      oxfordWater: Number(oxfordPrice.toFixed(2)),
    })
  }
  return history
}

// Create market makers
const createMarketMakers = (): Player[] => {
  const marketMakers: Player[] = []
  const names = ["Goldman MM", "Morgan MM", "Citadel MM", "Jane Street MM", "Virtu MM"]

  for (let i = 0; i < 5; i++) {
    marketMakers.push({
      id: `mm${i + 1}`,
      name: names[i],
      cash: 100000, // More cash for market making
      cambridgeShares: 1000,
      oxfordShares: 1000,
      totalValue: 0,
      isMarketMaker: true,
      ordersSubmitted: 0,
      isDone: false,
      isOnline: true,
    })
  }

  return marketMakers
}

export default function TradingGame() {
  const priceHistory = generatePriceHistory()
  const lastDay = priceHistory[priceHistory.length - 1]

  const [gameState, setGameState] = useState<GameState>({
    currentRound: 1,
    phase: "LOBBY",
    players: [...createMarketMakers()],
    orders: [],
    trades: [],
    priceHistory,
    currentPrices: { CAMB: lastDay.cambridgeMining, OXFD: lastDay.oxfordWater },
    gameStarted: false,
  })

  const [playerName, setPlayerName] = useState("")
  const [currentPlayerId, setCurrentPlayerId] = useState("")
  const [isMonitor, setIsMonitor] = useState(false)

  const [playerOrder, setPlayerOrder] = useState({
    stock: "CAMB" as "CAMB" | "OXFD",
    type: "BUY" as "BUY" | "SELL",
    price: "",
    quantity: "",
  })

  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId)
  const humanPlayers = gameState.players.filter((p) => !p.isMarketMaker)
  const marketMakers = gameState.players.filter((p) => p.isMarketMaker)

  // Join game as player or monitor
  const joinGame = (asMonitor = false) => {
    if (!playerName.trim()) return

    const newPlayerId = `player_${Date.now()}`
    const newPlayer: Player = {
      id: newPlayerId,
      name: playerName.trim(),
      cash: 10000,
      cambridgeShares: 0,
      oxfordShares: 0,
      totalValue: 10000,
      isMonitor: asMonitor,
      ordersSubmitted: 0,
      isDone: false,
      isOnline: true,
    }

    setGameState((prev) => ({
      ...prev,
      players: [...prev.players, newPlayer],
    }))

    setCurrentPlayerId(newPlayerId)
    setIsMonitor(asMonitor)
  }

  // Generate market maker orders with more realistic behavior
  const generateMarketMakerOrders = () => {
    const mmOrders: Order[] = []

    marketMakers.forEach((mm) => {
      if (mm.isDone) return

      // Market makers are more active and provide liquidity
      const ordersToPlace = Math.floor(Math.random() * 4) + 2 // 2-5 orders per MM

      for (let i = 0; i < ordersToPlace && (mm.ordersSubmitted || 0) < 5; i++) {
        const stock = Math.random() > 0.5 ? "CAMB" : "OXFD"
        const currentPrice = gameState.currentPrices[stock]

        // Market makers provide liquidity on both sides more frequently
        const type = Math.random() > 0.5 ? "BUY" : "SELL"

        // Market makers quote tighter spreads around current price
        let price: number
        if (type === "BUY") {
          // Bid slightly below current price (0.5% to 2% below)
          price = currentPrice * (0.98 + Math.random() * 0.015)
        } else {
          // Ask slightly above current price (0.5% to 2% above)
          price = currentPrice * (1.005 + Math.random() * 0.015)
        }

        price = Number(price.toFixed(2))
        const quantity = Math.floor(Math.random() * 150) + 50 // 50-199 shares

        // Check if MM can place this order
        const canPlace =
          type === "BUY"
            ? mm.cash >= price * quantity
            : (stock === "CAMB" ? mm.cambridgeShares : mm.oxfordShares) >= quantity

        if (canPlace) {
          mmOrders.push({
            id: `${mm.id}-${stock}-${Date.now()}-${i}`,
            playerId: mm.id,
            playerName: mm.name,
            stock,
            type,
            price,
            quantity,
            round: gameState.currentRound,
            status: "PENDING",
          })

          mm.ordersSubmitted = (mm.ordersSubmitted || 0) + 1
        }
      }

      // Market makers finish after placing their orders
      mm.isDone = true
    })

    return mmOrders
  }

  // Calculate new prices based on executed trades
  const calculateNewPrices = (trades: Trade[]) => {
    const newPrices = { ...gameState.currentPrices }

    // Group trades by stock
    const cambTrades = trades.filter((t) => t.stock === "CAMB")
    const oxfordTrades = trades.filter((t) => t.stock === "OXFD")

    // Calculate volume-weighted average price for each stock
    if (cambTrades.length > 0) {
      const totalVolume = cambTrades.reduce((sum, t) => sum + t.quantity, 0)
      const totalValue = cambTrades.reduce((sum, t) => sum + t.price * t.quantity, 0)
      newPrices.CAMB = Number((totalValue / totalVolume).toFixed(2))
    }

    if (oxfordTrades.length > 0) {
      const totalVolume = oxfordTrades.reduce((sum, t) => sum + t.quantity, 0)
      const totalValue = oxfordTrades.reduce((sum, t) => sum + t.price * t.quantity, 0)
      newPrices.OXFD = Number((totalValue / totalVolume).toFixed(2))
    }

    return newPrices
  }

  // Process orders and execute trades
  const processOrders = (allOrders: Order[]) => {
    const trades: Trade[] = []
    const updatedOrders = [...allOrders]

    // Separate buy and sell orders by stock
    const cambBuys = allOrders
      .filter((o) => o.stock === "CAMB" && o.type === "BUY" && o.status === "PENDING")
      .sort((a, b) => b.price - a.price)
    const cambSells = allOrders
      .filter((o) => o.stock === "CAMB" && o.type === "SELL" && o.status === "PENDING")
      .sort((a, b) => a.price - b.price)

    const oxfordBuys = allOrders
      .filter((o) => o.stock === "OXFD" && o.type === "BUY" && o.status === "PENDING")
      .sort((a, b) => b.price - a.price)
    const oxfordSells = allOrders
      .filter((o) => o.stock === "OXFD" && o.type === "SELL" && o.status === "PENDING")
      .sort((a, b) => a.price - b.price)

    // Match orders
    matchOrders(cambBuys, cambSells, "CAMB", trades, updatedOrders)
    matchOrders(oxfordBuys, oxfordSells, "OXFD", trades, updatedOrders)

    return { trades, orders: updatedOrders }
  }

  const matchOrders = (
    buyOrders: Order[],
    sellOrders: Order[],
    stock: "CAMB" | "OXFD",
    trades: Trade[],
    orders: Order[],
  ) => {
    let buyIndex = 0
    let sellIndex = 0

    while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
      const buyOrder = buyOrders[buyIndex]
      const sellOrder = sellOrders[sellIndex]

      if (buyOrder.price >= sellOrder.price) {
        const tradePrice = sellOrder.price
        const tradeQuantity = Math.min(buyOrder.quantity, sellOrder.quantity)

        trades.push({
          id: `trade-${Date.now()}-${Math.random()}`,
          stock,
          price: tradePrice,
          quantity: tradeQuantity,
          buyerId: buyOrder.playerId,
          sellerId: sellOrder.playerId,
          round: gameState.currentRound,
        })

        // Update order quantities
        const buyOrderIndex = orders.findIndex((o) => o.id === buyOrder.id)
        const sellOrderIndex = orders.findIndex((o) => o.id === sellOrder.id)

        if (buyOrderIndex !== -1) {
          orders[buyOrderIndex].quantity -= tradeQuantity
          orders[buyOrderIndex].filledQuantity = (orders[buyOrderIndex].filledQuantity || 0) + tradeQuantity
          if (orders[buyOrderIndex].quantity === 0) {
            orders[buyOrderIndex].status = "FILLED"
          } else {
            orders[buyOrderIndex].status = "PARTIAL"
          }
        }

        if (sellOrderIndex !== -1) {
          orders[sellOrderIndex].quantity -= tradeQuantity
          orders[sellOrderIndex].filledQuantity = (orders[sellOrderIndex].filledQuantity || 0) + tradeQuantity
          if (orders[sellOrderIndex].quantity === 0) {
            orders[sellOrderIndex].status = "FILLED"
          } else {
            orders[sellOrderIndex].status = "PARTIAL"
          }
        }

        if (buyOrder.quantity <= tradeQuantity) buyIndex++
        if (sellOrder.quantity <= tradeQuantity) sellIndex++

        buyOrder.quantity -= tradeQuantity
        sellOrder.quantity -= tradeQuantity
      } else {
        sellIndex++
      }
    }
  }

  // Update player portfolios based on trades
  const updatePlayerPortfolios = (trades: Trade[]) => {
    const updatedPlayers = [...gameState.players]

    trades.forEach((trade) => {
      const buyerIndex = updatedPlayers.findIndex((p) => p.id === trade.buyerId)
      const sellerIndex = updatedPlayers.findIndex((p) => p.id === trade.sellerId)

      if (buyerIndex !== -1 && sellerIndex !== -1) {
        const totalCost = trade.price * trade.quantity

        // Update buyer
        updatedPlayers[buyerIndex].cash -= totalCost
        if (trade.stock === "CAMB") {
          updatedPlayers[buyerIndex].cambridgeShares += trade.quantity
        } else {
          updatedPlayers[buyerIndex].oxfordShares += trade.quantity
        }

        // Update seller
        updatedPlayers[sellerIndex].cash += totalCost
        if (trade.stock === "CAMB") {
          updatedPlayers[sellerIndex].cambridgeShares -= trade.quantity
        } else {
          updatedPlayers[sellerIndex].oxfordShares -= trade.quantity
        }
      }
    })

    return updatedPlayers
  }

  const submitPlayerOrder = () => {
    if (!currentPlayer || currentPlayer.isMonitor) return
    if (!playerOrder.price || !playerOrder.quantity) return
    if ((currentPlayer.ordersSubmitted || 0) >= 5) return

    const price = Number.parseFloat(playerOrder.price)
    const quantity = Number.parseInt(playerOrder.quantity)

    // Validate order
    if (playerOrder.type === "BUY") {
      if (currentPlayer.cash < price * quantity) {
        alert("Insufficient funds!")
        return
      }
    } else {
      const shares = playerOrder.stock === "CAMB" ? currentPlayer.cambridgeShares : currentPlayer.oxfordShares
      if (shares < quantity) {
        alert("Insufficient shares!")
        return
      }
    }

    const newOrder: Order = {
      id: `${currentPlayerId}-${Date.now()}`,
      playerId: currentPlayerId,
      playerName: currentPlayer.name,
      stock: playerOrder.stock,
      type: playerOrder.type,
      price,
      quantity,
      round: gameState.currentRound,
      status: "PENDING",
    }

    setGameState((prev) => ({
      ...prev,
      orders: [...prev.orders, newOrder],
      players: prev.players.map((p) =>
        p.id === currentPlayerId ? { ...p, ordersSubmitted: (p.ordersSubmitted || 0) + 1 } : p,
      ),
    }))

    setPlayerOrder({ stock: "CAMB", type: "BUY", price: "", quantity: "" })
  }

  const markPlayerDone = () => {
    if (!currentPlayer) return

    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === currentPlayerId ? { ...p, isDone: true } : p)),
    }))
  }

  const processRound = () => {
    setGameState((prev) => ({ ...prev, phase: "PROCESSING" }))

    setTimeout(() => {
      // Generate market maker orders
      const mmOrders = generateMarketMakerOrders()
      const allOrders = [...gameState.orders, ...mmOrders]

      // Process orders and execute trades
      const { trades, orders } = processOrders(allOrders)

      // Calculate new prices based on trades
      const newPrices = calculateNewPrices(trades)

      // Update player portfolios
      const updatedPlayers = updatePlayerPortfolios(trades)

      // Update total values for all players
      updatedPlayers.forEach((player) => {
        player.totalValue = player.cash + player.cambridgeShares * newPrices.CAMB + player.oxfordShares * newPrices.OXFD
      })

      // Add new price point to history if there were trades
      const newPriceHistory = [...gameState.priceHistory]
      if (trades.length > 0) {
        newPriceHistory.push({
          day: 10 + gameState.currentRound,
          round: gameState.currentRound,
          cambridgeMining: newPrices.CAMB,
          oxfordWater: newPrices.OXFD,
          isTradeDay: true,
        })
      }

      setGameState((prev) => ({
        ...prev,
        orders,
        trades: [...prev.trades, ...trades],
        players: updatedPlayers,
        currentPrices: newPrices,
        priceHistory: newPriceHistory,
        phase: "RESULTS",
      }))
    }, 2000)
  }

  const nextRound = () => {
    if (gameState.currentRound >= 10) {
      // Game finished, calculate final rankings (exclude market makers)
      const humanPlayersOnly = gameState.players.filter((p) => !p.isMarketMaker)
      const rankedPlayers = [...gameState.players].map((player) => {
        if (player.isMarketMaker) return player
        const rank = humanPlayersOnly.filter((p) => p.totalValue > player.totalValue).length + 1
        return { ...player, rank }
      })

      setGameState((prev) => ({
        ...prev,
        players: rankedPlayers,
        phase: "FINISHED",
      }))
    } else {
      setGameState((prev) => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        phase: "TRADING",
        orders: prev.orders.filter((o) => o.status === "PENDING"),
        players: prev.players.map((p) => ({ ...p, ordersSubmitted: 0, isDone: false })),
      }))
    }
  }

  const startGame = () => {
    setGameState((prev) => ({ ...prev, phase: "SETUP", gameStarted: true }))
  }

  const startTrading = () => {
    setGameState((prev) => ({ ...prev, phase: "TRADING" }))
  }

  const getOrderBook = (stock: "CAMB" | "OXFD") => {
    const pendingOrders = gameState.orders.filter((o) => o.stock === stock && o.status === "PENDING")
    const buyOrders = pendingOrders.filter((o) => o.type === "BUY").sort((a, b) => b.price - a.price)
    const sellOrders = pendingOrders.filter((o) => o.type === "SELL").sort((a, b) => a.price - b.price)

    return { buyOrders, sellOrders }
  }

  const canProcessRound = () => {
    const humanPlayersOnly = gameState.players.filter((p) => !p.isMarketMaker)
    return humanPlayersOnly.every((p) => p.isDone || (p.ordersSubmitted || 0) >= 5)
  }

  // Lobby phase - players join the game
  if (gameState.phase === "LOBBY") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Trading Simulation Game</CardTitle>
              <p className="text-muted-foreground">Multiplayer Stock Trading Competition</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {!currentPlayerId ? (
                <div className="max-w-md mx-auto space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="playerName">Your Name</Label>
                    <Input
                      id="playerName"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter your name"
                      onKeyPress={(e) => e.key === "Enter" && joinGame(false)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => joinGame(false)} className="flex-1">
                      <Users className="w-4 h-4 mr-2" />
                      Join as Player
                    </Button>
                    <Button onClick={() => joinGame(true)} variant="outline" className="flex-1">
                      <Monitor className="w-4 h-4 mr-2" />
                      Join as Monitor
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {isMonitor ? "Monitor" : "Player"}: {currentPlayer?.name}
                    </Badge>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Players in Lobby ({humanPlayers.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {humanPlayers.map((player) => (
                          <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="font-medium">{player.name}</span>
                            <div className="flex items-center gap-2">
                              {player.isMonitor && <Badge variant="secondary">Monitor</Badge>}
                              <Badge variant="outline" className="text-green-600">
                                Online
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {isMonitor && (
                    <div className="text-center">
                      <Button onClick={startGame} size="lg" disabled={humanPlayers.length < 2}>
                        Start Game
                      </Button>
                      {humanPlayers.length < 2 && (
                        <p className="text-sm text-muted-foreground mt-2">Need at least 2 players to start</p>
                      )}
                    </div>
                  )}

                  {!isMonitor && (
                    <div className="text-center">
                      <p className="text-muted-foreground">Waiting for monitor to start the game...</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Setup phase - show rules and price history
  if (gameState.phase === "SETUP") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Trading Simulation Game</CardTitle>
              <p className="text-muted-foreground">10-Round Stock Trading Competition</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Prices */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">Cambridge Mining (CAMB)</CardTitle>
                    <div className="text-3xl font-bold text-blue-600">${gameState.currentPrices.CAMB.toFixed(2)}</div>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">Oxford Water (OXFD)</CardTitle>
                    <div className="text-3xl font-bold text-green-600">${gameState.currentPrices.OXFD.toFixed(2)}</div>
                  </CardHeader>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Game Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>• Trade two stocks: Cambridge Mining (CAMB) and Oxford Water (OXFD)</p>
                    <p>• 10 rounds of trading with order matching</p>
                    <p>• Submit up to 5 orders per round</p>
                    <p>• Click "Done" to finish early and wait for others</p>
                    <p>• Orders execute when bid ≥ ask price</p>
                    <p>• View order book depth before each decision</p>
                    <p>• Starting capital: $10,000</p>
                    <p>• 5 market makers provide liquidity</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Price History (Last 10 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        cambridgeMining: {
                          label: "Cambridge Mining",
                          color: "hsl(var(--chart-1))",
                        },
                        oxfordWater: {
                          label: "Oxford Water",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={gameState.priceHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="cambridgeMining"
                            stroke="var(--color-cambridgeMining)"
                            name="Cambridge Mining"
                            strokeWidth={2}
                            dot={<TradeDot />}
                          />
                          <Line
                            type="monotone"
                            dataKey="oxfordWater"
                            stroke="var(--color-oxfordWater)"
                            name="Oxford Water"
                            strokeWidth={2}
                            dot={<TradeDot />}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center">
                {isMonitor ? (
                  <Button onClick={startTrading} size="lg">
                    Start Trading
                  </Button>
                ) : (
                  <p className="text-muted-foreground">Waiting for monitor to start trading...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Finished phase - show final scoreboard
  if (gameState.phase === "FINISHED") {
    const humanPlayersOnly = gameState.players
      .filter((p) => !p.isMarketMaker)
      .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
                <Trophy className="w-8 h-8 text-yellow-500" />
                Final Scoreboard
              </CardTitle>
              <p className="text-muted-foreground">Game Complete - 10 Rounds Finished</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Final Prices Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Movement Throughout Game</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      cambridgeMining: {
                        label: "Cambridge Mining",
                        color: "hsl(var(--chart-1))",
                      },
                      oxfordWater: {
                        label: "Oxford Water",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={gameState.priceHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="cambridgeMining"
                          stroke="var(--color-cambridgeMining)"
                          name="Cambridge Mining"
                          strokeWidth={2}
                          dot={<TradeDot />}
                        />
                        <Line
                          type="monotone"
                          dataKey="oxfordWater"
                          stroke="var(--color-oxfordWater)"
                          name="Oxford Water"
                          strokeWidth={2}
                          dot={<TradeDot />}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Human Players Scoreboard */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>CAMB Shares</TableHead>
                    <TableHead>OXFD Shares</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Profit/Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {humanPlayersOnly.map((player, index) => (
                    <TableRow key={player.id} className={player.id === currentPlayerId ? "bg-blue-50" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}#{index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {player.name}
                        {player.isMonitor && (
                          <Badge variant="secondary" className="ml-2">
                            Monitor
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>${player.cash.toLocaleString()}</TableCell>
                      <TableCell>{player.cambridgeShares}</TableCell>
                      <TableCell>{player.oxfordShares}</TableCell>
                      <TableCell className="font-bold">${player.totalValue.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={player.totalValue >= 10000 ? "text-green-600" : "text-red-600"}>
                          ${(player.totalValue - 10000).toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Trading phase - main game interface
  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Trading Game</h1>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Round {gameState.currentRound}/10
            </Badge>
            <Badge variant={gameState.phase === "PROCESSING" ? "secondary" : "default"}>
              {gameState.phase === "TRADING"
                ? "Trading Phase"
                : gameState.phase === "PROCESSING"
                  ? "Processing..."
                  : "Results"}
            </Badge>
            <Badge variant="outline">
              {currentPlayer.isMonitor ? "Monitor" : "Player"}: {currentPlayer.name}
            </Badge>
          </div>
        </div>

        {/* Current Prices */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Cambridge Mining (CAMB)</CardTitle>
              <div className="text-2xl font-bold text-blue-600">${gameState.currentPrices.CAMB.toFixed(2)}</div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Oxford Water (OXFD)</CardTitle>
              <div className="text-2xl font-bold text-green-600">${gameState.currentPrices.OXFD.toFixed(2)}</div>
            </CardHeader>
          </Card>
        </div>

        {/* Player Status (only for non-monitors) */}
        {!currentPlayer.isMonitor && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cash Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${currentPlayer.cash.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">CAMB Shares</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentPlayer.cambridgeShares}</div>
                <p className="text-xs text-muted-foreground">
                  Value: ${(currentPlayer.cambridgeShares * gameState.currentPrices.CAMB).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">OXFD Shares</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentPlayer.oxfordShares}</div>
                <p className="text-xs text-muted-foreground">
                  Value: ${(currentPlayer.oxfordShares * gameState.currentPrices.OXFD).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${currentPlayer.totalValue.toLocaleString()}</div>
                <p className={`text-xs ${currentPlayer.totalValue >= 10000 ? "text-green-600" : "text-red-600"}`}>
                  P&L: ${(currentPlayer.totalValue - 10000).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Entry / Monitor Panel */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentPlayer.isMonitor ? "Monitor Panel" : `Place Orders (${currentPlayer.ordersSubmitted}/5)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPlayer.isMonitor ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Player Status</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {humanPlayers
                        .filter((p) => !p.isMonitor)
                        .map((player) => (
                          <div key={player.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                            <span>{player.name}</span>
                            <div className="flex items-center gap-2">
                              <span>{player.ordersSubmitted}/5</span>
                              {player.isDone ? (
                                <Badge variant="default" className="text-xs">
                                  Done
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Trading
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <Button onClick={markPlayerDone} className="w-full bg-transparent" variant="outline">
                    Mark Done (Monitor)
                  </Button>
                </div>
              ) : gameState.phase === "TRADING" && !currentPlayer.isDone && (currentPlayer.ordersSubmitted || 0) < 5 ? (
                <>
                  <div className="space-y-2">
                    <Label>Stock</Label>
                    <Select
                      value={playerOrder.stock}
                      onValueChange={(value: "CAMB" | "OXFD") => setPlayerOrder((prev) => ({ ...prev, stock: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAMB">Cambridge Mining (${gameState.currentPrices.CAMB})</SelectItem>
                        <SelectItem value="OXFD">Oxford Water (${gameState.currentPrices.OXFD})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Order Type</Label>
                    <Select
                      value={playerOrder.type}
                      onValueChange={(value: "BUY" | "SELL") => setPlayerOrder((prev) => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SELL">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Price per Share</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={playerOrder.price}
                      onChange={(e) => setPlayerOrder((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="Enter your price"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={playerOrder.quantity}
                      onChange={(e) => setPlayerOrder((prev) => ({ ...prev, quantity: e.target.value }))}
                      placeholder="Number of shares"
                    />
                  </div>

                  {playerOrder.price && playerOrder.quantity && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">
                        <strong>
                          Total: $
                          {(Number.parseFloat(playerOrder.price) * Number.parseInt(playerOrder.quantity)).toFixed(2)}
                        </strong>
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={submitPlayerOrder} className="flex-1">
                      Submit Order
                    </Button>
                    <Button onClick={markPlayerDone} variant="outline" className="flex-1 bg-transparent">
                      Done
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  {currentPlayer.isDone ? (
                    <div>
                      <p className="text-green-600 font-medium">You're Done!</p>
                      <p className="text-sm text-muted-foreground mt-2">Waiting for others...</p>
                    </div>
                  ) : (currentPlayer.ordersSubmitted || 0) >= 5 ? (
                    <div>
                      <p className="text-blue-600 font-medium">Max Orders Reached!</p>
                      <p className="text-sm text-muted-foreground mt-2">Waiting for others...</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Trading phase ended</p>
                  )}
                </div>
              )}

              {gameState.phase === "TRADING" && canProcessRound() && isMonitor && (
                <Button onClick={processRound} className="w-full" variant="default">
                  Process Round
                </Button>
              )}

              {gameState.phase === "RESULTS" && isMonitor && (
                <Button onClick={nextRound} className="w-full">
                  {gameState.currentRound >= 10 ? "View Final Results" : "Next Round"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Price Chart and Order Books */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Price Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    cambridgeMining: {
                      label: "Cambridge Mining",
                      color: "hsl(var(--chart-1))",
                    },
                    oxfordWater: {
                      label: "Oxford Water",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={gameState.priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="cambridgeMining"
                        stroke="var(--color-cambridgeMining)"
                        name="Cambridge Mining"
                        strokeWidth={2}
                        dot={<TradeDot />}
                      />
                      <Line
                        type="monotone"
                        dataKey="oxfordWater"
                        stroke="var(--color-oxfordWater)"
                        name="Oxford Water"
                        strokeWidth={2}
                        dot={<TradeDot />}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Order Books */}
            <Tabs defaultValue="camb" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="camb">Cambridge Mining</TabsTrigger>
                <TabsTrigger value="oxfd">Oxford Water</TabsTrigger>
              </TabsList>

              <TabsContent value="camb">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      CAMB Order Book
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OrderBookDisplay orderBook={getOrderBook("CAMB")} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="oxfd">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      OXFD Order Book
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OrderBookDisplay orderBook={getOrderBook("OXFD")} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Recent Trades */}
        {gameState.trades.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Round</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameState.trades
                    .slice(-10)
                    .reverse()
                    .map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell>{trade.round}</TableCell>
                        <TableCell className="font-medium">{trade.stock}</TableCell>
                        <TableCell>${trade.price.toFixed(2)}</TableCell>
                        <TableCell>{trade.quantity}</TableCell>
                        <TableCell>{gameState.players.find((p) => p.id === trade.buyerId)?.name}</TableCell>
                        <TableCell>{gameState.players.find((p) => p.id === trade.sellerId)?.name}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

interface OrderBookDisplayProps {
  orderBook: {
    buyOrders: Order[]
    sellOrders: Order[]
  }
}

function OrderBookDisplay({ orderBook }: OrderBookDisplayProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="font-medium text-green-600 mb-2">Buy Orders (Bids)</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {orderBook.buyOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No buy orders</p>
          ) : (
            orderBook.buyOrders.map((order) => (
              <div key={order.id} className="flex justify-between text-sm p-2 bg-green-50 rounded">
                <span>${order.price.toFixed(2)}</span>
                <span>{order.quantity}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[60px]">{order.playerName}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-red-600 mb-2">Sell Orders (Asks)</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {orderBook.sellOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sell orders</p>
          ) : (
            orderBook.sellOrders.map((order) => (
              <div key={order.id} className="flex justify-between text-sm p-2 bg-red-50 rounded">
                <span>${order.price.toFixed(2)}</span>
                <span>{order.quantity}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[60px]">{order.playerName}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
