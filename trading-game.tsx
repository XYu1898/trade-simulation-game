"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Trophy, Clock, BookOpen, Users, Monitor, Wifi, WifiOff, AlertCircle, LogIn, StopCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useGameState } from "./hooks/useGameState"

// Renders a red dot on trade days, otherwise nothing
function TradeDot(props: any) {
  if (props.payload?.isTradeDay) {
    return <circle cx={props.cx} cy={props.cy} r={4} fill="red" />
  }
  return null
}

export default function TradingGame() {
  const gameId = "trading-game-main" // Single game instance
  const {
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
  } = useGameState(gameId)

  const [playerName, setPlayerName] = useState("")
  const [playerOrder, setPlayerOrder] = useState({
    stock: "CAMB" as const,
    type: "BUY" as "BUY" | "SELL",
    price: "",
    quantity: "",
  })

  const currentPlayer = gameState?.players.find((p) => p.id === currentPlayerId)
  const humanPlayers = gameState?.players || []
  const isMonitor = currentPlayer?.isMonitor || false

  // Connection status display
  if (connectionError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {connectionError}
                <br />
                <Button onClick={() => window.location.reload()} className="mt-2" size="sm">
                  Retry Connection
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <WifiOff className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Connecting to game server...</p>
            <p className="text-sm text-muted-foreground mt-2">Server: trade-simulation-game.fly.dev</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show login if no current player
  if (!currentPlayerId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
                <LogIn className="w-8 h-8" />
                Trading Simulation Game
              </CardTitle>
              <p className="text-muted-foreground">Multiplayer Stock Trading Competition</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Connected to Server</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md mx-auto space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="playerName">Your Name</Label>
                  <Input
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    onKeyPress={(e) => e.key === "Enter" && playerName.trim() && joinGame(playerName.trim(), false)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => joinGame(playerName.trim(), false)}
                    className="flex-1"
                    disabled={!playerName.trim()}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Join as Player
                  </Button>
                  <Button
                    onClick={() => joinGame(playerName.trim(), true)}
                    variant="outline"
                    className="flex-1"
                    disabled={!playerName.trim()}
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    Join as Monitor
                  </Button>
                </div>
              </div>

              {gameState && humanPlayers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Current Players ({humanPlayers.length})
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const submitPlayerOrder = () => {
    if (!currentPlayer || currentPlayer.isMonitor) return
    if (!playerOrder.price || !playerOrder.quantity) return
    if ((currentPlayer.ordersSubmitted || 0) >= 2) return

    const price = Number.parseInt(playerOrder.price)
    const quantity = Number.parseInt(playerOrder.quantity)

    // Validate price is integer
    if (!Number.isInteger(price) || price <= 0) {
      alert("Price must be a positive integer!")
      return
    }

    // Validate order
    if (playerOrder.type === "BUY") {
      if (currentPlayer.cash < price * quantity) {
        alert("Insufficient funds!")
        return
      }
    } else {
      if (currentPlayer.cambridgeShares < quantity) {
        alert("Insufficient shares!")
        return
      }
    }

    submitOrder({
      playerId: currentPlayerId,
      playerName: currentPlayer.name,
      stock: playerOrder.stock,
      type: playerOrder.type,
      price,
      quantity,
    })

    setPlayerOrder({ stock: "CAMB", type: "BUY", price: "", quantity: "" })
  }

  const getConsolidatedOrderBook = () => {
    if (!gameState || !gameState.consolidatedOrders) {
      return { buyOrders: [], sellOrders: [] }
    }

    const buyOrders = Object.entries(gameState.consolidatedOrders.BUY || {})
      .map(([price, quantity]) => ({ price: Number.parseInt(price), quantity: quantity as number }))
      .sort((a, b) => b.price - a.price)

    const sellOrders = Object.entries(gameState.consolidatedOrders.SELL || {})
      .map(([price, quantity]) => ({ price: Number.parseInt(price), quantity: quantity as number }))
      .sort((a, b) => a.price - b.price)

    return { buyOrders, sellOrders }
  }

  const canProcessRound = () => {
    if (!gameState) return false
    const humanPlayersOnly = gameState.players.filter((p) => !p.isMonitor)
    return humanPlayersOnly.every((p) => p.isDone || (p.ordersSubmitted || 0) >= 2)
  }

  // Get external investor info for current round
  const getExternalInvestorInfo = () => {
    if (!gameState) return null

    if (gameState.currentRound === 4) {
      const sellPrice = Math.floor(gameState.currentPrices.CAMB * 0.5)
      return {
        type: "SELL",
        quantity: 500,
        price: sellPrice,
        description: "External Investor selling 500 shares at 50% of current price",
      }
    } else if (gameState.currentRound === 7) {
      const buyPrice = Math.floor(gameState.currentPrices.CAMB * 2.0)
      return {
        type: "BUY",
        quantity: 500,
        price: buyPrice,
        description: "External Investor buying 500 shares at 200% of current price",
      }
    }
    return null
  }

  // Lobby phase - players join the game
  if (gameState?.phase === "LOBBY") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Trading Simulation Game</CardTitle>
              <p className="text-muted-foreground">Multiplayer Stock Trading Competition</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Connected to Server</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  <Button onClick={startGame} size="lg" disabled={humanPlayers.filter((p) => !p.isMonitor).length < 1}>
                    Start Game
                  </Button>
                  {humanPlayers.filter((p) => !p.isMonitor).length < 1 && (
                    <p className="text-sm text-muted-foreground mt-2">Need at least 1 player to start</p>
                  )}
                </div>
              )}

              {!isMonitor && (
                <div className="text-center">
                  <p className="text-muted-foreground">Waiting for monitor to start the game...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Setup phase - show rules and price history
  if (gameState?.phase === "SETUP") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Trading Simulation Game</CardTitle>
              <p className="text-muted-foreground">10-Round Stock Trading Competition</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Connected to Server</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Price */}
              <div className="flex justify-center">
                <Card className="w-96">
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">Cambridge Mining (CAMB)</CardTitle>
                    <div className="text-4xl font-bold text-blue-600">${gameState.currentPrices.CAMB}</div>
                  </CardHeader>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Game Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>• Trade Cambridge Mining (CAMB) stock only</p>
                    <p>• 10 rounds of trading with order matching</p>
                    <p>• Submit up to 2 orders per round</p>
                    <p>• Click "Done" to finish early and wait for others</p>
                    <p>• Orders execute when bid price ≥ ask price</p>
                    <p>
                      • <strong>Prices must be integers only</strong>
                    </p>
                    <p>• Starting: $10,000 cash + 200 CAMB shares</p>
                    <p>• Orders are hidden until round processing</p>
                    <p>• Next round price = rounded trade average</p>
                    <p>• Only your own trades are visible</p>
                    <p>• Previous round orders shown consolidated</p>
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Price History (Last 20 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        cambridgeMining: {
                          label: "Cambridge Mining",
                          color: "hsl(var(--chart-1))",
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
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center">
                {isMonitor ? (
                  <Button onClick={startTrading} size="lg">
                    Start Trading Round 1
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
  if (gameState?.phase === "FINISHED") {
    const humanPlayersOnly = gameState.players
      .filter((p) => !p.isMonitor)
      .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))

    const initialValue = 10000 + 200 * 50 // Initial cash + shares * initial price

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
              <div className="flex items-center justify-center gap-2 mt-2">
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Connected to Server</span>
              </div>
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
                      <TableCell className="font-bold">${player.totalValue.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={player.totalValue >= initialValue ? "text-green-600" : "text-red-600"}>
                          ${(player.totalValue - initialValue).toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="text-center">
                <Button onClick={() => window.location.reload()} size="lg">
                  Start New Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Trading phase - main game interface
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading game state...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const initialValue = 10000 + 200 * 50 // Initial cash + shares * initial price
  const consolidatedOrderBook = getConsolidatedOrderBook()
  const externalInvestorInfo = getExternalInvestorInfo()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Trading Game</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">Connected</span>
            </div>
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
              {currentPlayer?.isMonitor ? "Monitor" : "Player"}: {currentPlayer?.name}
            </Badge>
          </div>
        </div>

        {/* External Investor Alert */}
        {externalInvestorInfo && gameState.phase === "TRADING" && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>External Investor Alert:</strong> {externalInvestorInfo.description} ($
              {externalInvestorInfo.price} per share)
            </AlertDescription>
          </Alert>
        )}

        {/* Current Price */}
        <div className="flex justify-center mb-6">
          <Card className="w-96">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Cambridge Mining (CAMB)</CardTitle>
              <div className="text-3xl font-bold text-blue-600">${gameState.currentPrices.CAMB}</div>
            </CardHeader>
          </Card>
        </div>

        {/* Player Status (only for non-monitors) */}
        {!currentPlayer?.isMonitor && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cash Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${currentPlayer?.cash.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">CAMB Shares</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentPlayer?.cambridgeShares}</div>
                <p className="text-xs text-muted-foreground">
                  Value: ${((currentPlayer?.cambridgeShares || 0) * gameState.currentPrices.CAMB).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${currentPlayer?.totalValue.toLocaleString()}</div>
                <p
                  className={`text-xs ${(currentPlayer?.totalValue || 0) >= initialValue ? "text-green-600" : "text-red-600"}`}
                >
                  P&L: ${((currentPlayer?.totalValue || 0) - initialValue).toLocaleString()}
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
                {currentPlayer?.isMonitor ? "Monitor Panel" : `Place Orders (${currentPlayer?.ordersSubmitted || 0}/2)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPlayer?.isMonitor ? (
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
                              <span>{player.ordersSubmitted || 0}/2</span>
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

                  {/* Monitor can see current orders during trading */}
                  {gameState.phase === "TRADING" && gameState.orders.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Current Orders</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {gameState.orders.map((order) => (
                          <div key={order.id} className="text-xs p-2 bg-gray-50 rounded">
                            <span className={order.type === "BUY" ? "text-green-600" : "text-red-600"}>
                              {order.type}
                            </span>{" "}
                            {order.quantity} @ ${order.price} ({order.playerName})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {gameState.phase === "TRADING" && (
                    <div className="space-y-2">
                      <Button onClick={forceCloseOrders} variant="destructive" className="w-full" size="sm">
                        <StopCircle className="w-4 h-4 mr-2" />
                        Force Close Orders
                      </Button>

                      {canProcessRound() && (
                        <Button onClick={processRound} className="w-full" variant="default">
                          Process Round {gameState.currentRound}
                        </Button>
                      )}
                    </div>
                  )}

                  {gameState.phase === "RESULTS" && (
                    <Button onClick={nextRound} className="w-full">
                      {gameState.currentRound >= 10
                        ? "View Final Results"
                        : `Start Round ${gameState.currentRound + 1}`}
                    </Button>
                  )}
                </div>
              ) : gameState.phase === "TRADING" &&
                !currentPlayer?.isDone &&
                (currentPlayer?.ordersSubmitted || 0) < 2 ? (
                <>
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
                    <Label>Price per Share (Integer Only)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={playerOrder.price}
                      onChange={(e) => setPlayerOrder((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="Enter integer price"
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
                          {(
                            Number.parseInt(playerOrder.price) * Number.parseInt(playerOrder.quantity)
                          ).toLocaleString()}
                        </strong>
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={submitPlayerOrder} className="flex-1">
                      Submit Order
                    </Button>
                    <Button onClick={markDone} variant="outline" className="flex-1 bg-transparent">
                      Done
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  {currentPlayer?.isDone ? (
                    <div>
                      <p className="text-green-600 font-medium">You're Done!</p>
                      <p className="text-sm text-muted-foreground mt-2">Waiting for others...</p>
                    </div>
                  ) : (currentPlayer?.ordersSubmitted || 0) >= 2 ? (
                    <div>
                      <p className="text-blue-600 font-medium">Max Orders Reached!</p>
                      <p className="text-sm text-muted-foreground mt-2">Waiting for others...</p>
                    </div>
                  ) : gameState.phase === "PROCESSING" ? (
                    <div>
                      <p className="text-orange-600 font-medium">Processing Round...</p>
                      <p className="text-sm text-muted-foreground mt-2">Please wait</p>
                    </div>
                  ) : gameState.phase === "RESULTS" ? (
                    <div>
                      <p className="text-blue-600 font-medium">Round Complete!</p>
                      <p className="text-sm text-muted-foreground mt-2">Waiting for next round...</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Trading phase ended</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price Chart and Order Book */}
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
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Consolidated Order Book */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  CAMB Order Book - Previous Round{" "}
                  {gameState.currentRound > 1 ? `(Round ${gameState.currentRound - 1})` : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gameState.currentRound === 1 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No orders to display in first round</p>
                    <p className="text-sm mt-2">Orders will be consolidated and shown from round 2</p>
                  </div>
                ) : consolidatedOrderBook.buyOrders.length === 0 && consolidatedOrderBook.sellOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No orders from previous round</p>
                    <p className="text-sm mt-2">All previous orders were executed or cancelled</p>
                  </div>
                ) : (
                  <ConsolidatedOrderBookDisplay orderBook={consolidatedOrderBook} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* My Trades (only show player's own trades) */}
        {gameState.trades.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>My Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Round</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameState.trades
                    .slice(-10)
                    .reverse()
                    .map((trade) => {
                      const isBuyer = trade.buyerId === currentPlayerId
                      const side = isBuyer ? "BUY" : "SELL"
                      return (
                        <TableRow key={trade.id}>
                          <TableCell>{trade.round}</TableCell>
                          <TableCell className="font-medium">{trade.stock}</TableCell>
                          <TableCell>
                            <Badge variant={isBuyer ? "default" : "secondary"}>{side}</Badge>
                          </TableCell>
                          <TableCell>${trade.price}</TableCell>
                          <TableCell>{trade.quantity}</TableCell>
                          <TableCell>${(trade.price * trade.quantity).toLocaleString()}</TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Live Scoreboard */}
        {humanPlayers.filter((p) => !p.isMonitor).length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Live Scoreboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {humanPlayers
                    .filter((p) => !p.isMonitor)
                    .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
                    .map((player, index) => (
                      <TableRow key={player.id} className={player.id === currentPlayerId ? "bg-blue-50" : ""}>
                        <TableCell>#{index + 1}</TableCell>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>${player.totalValue.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={player.totalValue >= initialValue ? "text-green-600" : "text-red-600"}>
                            ${(player.totalValue - initialValue).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600">
                              Online
                            </Badge>
                            {gameState.phase === "TRADING" && (
                              <Badge variant="outline">
                                {player.ordersSubmitted || 0}/2
                                {player.isDone && " (Done)"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
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

// Component to display consolidated order book
function ConsolidatedOrderBookDisplay({ orderBook }: { orderBook: { buyOrders: any[]; sellOrders: any[] } }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Buy Orders */}
      <div>
        <h4 className="font-medium text-green-600 mb-2">Buy Orders</h4>
        <div className="space-y-1">
          {orderBook.buyOrders.length > 0 ? (
            orderBook.buyOrders.map((order, index) => (
              <div key={index} className="flex justify-between text-sm p-2 bg-green-50 rounded">
                <span>${order.price}</span>
                <span>{order.quantity}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No buy orders</p>
          )}
        </div>
      </div>

      {/* Sell Orders */}
      <div>
        <h4 className="font-medium text-red-600 mb-2">Sell Orders</h4>
        <div className="space-y-1">
          {orderBook.sellOrders.length > 0 ? (
            orderBook.sellOrders.map((order, index) => (
              <div key={index} className="flex justify-between text-sm p-2 bg-red-50 rounded">
                <span>${order.price}</span>
                <span>{order.quantity}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No sell orders</p>
          )}
        </div>
      </div>
    </div>
  )
}
