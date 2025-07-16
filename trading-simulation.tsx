"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity, LogOut } from "lucide-react"

interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

interface Holding {
  symbol: string
  name: string
  shares: number
  avgPrice: number
  currentPrice: number
  totalValue: number
  gainLoss: number
  gainLossPercent: number
}

interface Trade {
  id: string
  symbol: string
  type: "BUY" | "SELL"
  shares: number
  price: number
  total: number
  timestamp: Date
  status: "COMPLETED" | "PENDING" | "CANCELLED"
}

const mockStocks: Stock[] = [
  { symbol: "AAPL", name: "Apple Inc.", price: 175.43, change: 2.15, changePercent: 1.24 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 142.56, change: -1.23, changePercent: -0.85 },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 378.85, change: 5.67, changePercent: 1.52 },
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.42, change: -8.34, changePercent: -3.25 },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: 145.78, change: 3.21, changePercent: 2.25 },
]

export default function TradingSimulation() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [user, setUser] = useState({ name: "", balance: 10000 })
  const [stocks, setStocks] = useState<Stock[]>(mockStocks)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY")
  const [orderShares, setOrderShares] = useState("")
  const [orderPrice, setOrderPrice] = useState("")

  // Simulate real-time price updates
  useEffect(() => {
    if (!isLoggedIn) return

    const interval = setInterval(() => {
      setStocks((prevStocks) =>
        prevStocks.map((stock) => {
          const changePercent = (Math.random() - 0.5) * 0.1 // Random change between -5% and 5%
          const newPrice = stock.price * (1 + changePercent)
          const change = newPrice - stock.price

          return {
            ...stock,
            price: Number(newPrice.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number((changePercent * 100).toFixed(2)),
          }
        }),
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [isLoggedIn])

  // Update holdings when stock prices change
  useEffect(() => {
    setHoldings((prevHoldings) =>
      prevHoldings.map((holding) => {
        const currentStock = stocks.find((s) => s.symbol === holding.symbol)
        if (!currentStock) return holding

        const totalValue = holding.shares * currentStock.price
        const gainLoss = totalValue - holding.shares * holding.avgPrice
        const gainLossPercent = (gainLoss / (holding.shares * holding.avgPrice)) * 100

        return {
          ...holding,
          currentPrice: currentStock.price,
          totalValue: Number(totalValue.toFixed(2)),
          gainLoss: Number(gainLoss.toFixed(2)),
          gainLossPercent: Number(gainLossPercent.toFixed(2)),
        }
      }),
    )
  }, [stocks])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (username && password) {
      setUser({ name: username, balance: 10000 })
      setIsLoggedIn(true)
      // Initialize with some sample holdings
      setHoldings([
        {
          symbol: "AAPL",
          name: "Apple Inc.",
          shares: 10,
          avgPrice: 170.0,
          currentPrice: 175.43,
          totalValue: 1754.3,
          gainLoss: 54.3,
          gainLossPercent: 3.19,
        },
      ])
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUsername("")
    setPassword("")
    setUser({ name: "", balance: 0 })
    setHoldings([])
    setTrades([])
  }

  const handleStockSelect = (symbol: string) => {
    const stock = stocks.find((s) => s.symbol === symbol)
    setSelectedStock(stock || null)
    setOrderPrice(stock?.price.toString() || "")
  }

  const handlePlaceOrder = () => {
    if (!selectedStock || !orderShares || !orderPrice) return

    const shares = Number.parseInt(orderShares)
    const price = Number.parseFloat(orderPrice)
    const total = shares * price

    if (orderType === "BUY" && total > user.balance) {
      alert("Insufficient funds!")
      return
    }

    const existingHolding = holdings.find((h) => h.symbol === selectedStock.symbol)

    if (orderType === "SELL" && (!existingHolding || existingHolding.shares < shares)) {
      alert("Insufficient shares!")
      return
    }

    // Create trade record
    const newTrade: Trade = {
      id: Date.now().toString(),
      symbol: selectedStock.symbol,
      type: orderType,
      shares,
      price,
      total,
      timestamp: new Date(),
      status: "COMPLETED",
    }

    setTrades((prev) => [newTrade, ...prev])

    // Update balance
    if (orderType === "BUY") {
      setUser((prev) => ({ ...prev, balance: prev.balance - total }))
    } else {
      setUser((prev) => ({ ...prev, balance: prev.balance + total }))
    }

    // Update holdings
    if (orderType === "BUY") {
      if (existingHolding) {
        const newShares = existingHolding.shares + shares
        const newAvgPrice = (existingHolding.shares * existingHolding.avgPrice + total) / newShares

        setHoldings((prev) =>
          prev.map((h) =>
            h.symbol === selectedStock.symbol
              ? { ...h, shares: newShares, avgPrice: Number(newAvgPrice.toFixed(2)) }
              : h,
          ),
        )
      } else {
        const newHolding: Holding = {
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          shares,
          avgPrice: price,
          currentPrice: selectedStock.price,
          totalValue: shares * selectedStock.price,
          gainLoss: 0,
          gainLossPercent: 0,
        }
        setHoldings((prev) => [...prev, newHolding])
      }
    } else {
      if (existingHolding) {
        const newShares = existingHolding.shares - shares
        if (newShares === 0) {
          setHoldings((prev) => prev.filter((h) => h.symbol !== selectedStock.symbol))
        } else {
          setHoldings((prev) => prev.map((h) => (h.symbol === selectedStock.symbol ? { ...h, shares: newShares } : h)))
        }
      }
    }

    // Reset form
    setOrderShares("")
    setOrderPrice(selectedStock.price.toString())
  }

  const totalPortfolioValue = holdings.reduce((sum, holding) => sum + holding.totalValue, 0)
  const totalGainLoss = holdings.reduce((sum, holding) => sum + holding.gainLoss, 0)
  const totalGainLossPercent =
    totalPortfolioValue > 0 ? (totalGainLoss / (totalPortfolioValue - totalGainLoss)) * 100 : 0

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Trading Simulator</CardTitle>
            <p className="text-muted-foreground">Sign in to start trading</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Trading Simulator</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {user.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${user.balance.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPortfolioValue.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
              {totalGainLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${totalGainLoss.toLocaleString()}
              </div>
              <p className={`text-xs ${totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                {totalGainLossPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(user.balance + totalPortfolioValue).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Market Data & Order Entry */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Data */}
            <Card>
              <CardHeader>
                <CardTitle>Market Data</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stocks.map((stock) => (
                      <TableRow key={stock.symbol}>
                        <TableCell className="font-medium">{stock.symbol}</TableCell>
                        <TableCell>{stock.name}</TableCell>
                        <TableCell>${stock.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className={`flex items-center ${stock.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {stock.change >= 0 ? (
                              <TrendingUp className="w-4 h-4 mr-1" />
                            ) : (
                              <TrendingDown className="w-4 h-4 mr-1" />
                            )}
                            ${stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleStockSelect(stock.symbol)}>
                            Trade
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Holdings */}
            <Card>
              <CardHeader>
                <CardTitle>Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                {holdings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No holdings yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Shares</TableHead>
                        <TableHead>Avg Price</TableHead>
                        <TableHead>Current Price</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holdings.map((holding) => (
                        <TableRow key={holding.symbol}>
                          <TableCell className="font-medium">{holding.symbol}</TableCell>
                          <TableCell>{holding.shares}</TableCell>
                          <TableCell>${holding.avgPrice.toFixed(2)}</TableCell>
                          <TableCell>${holding.currentPrice.toFixed(2)}</TableCell>
                          <TableCell>${holding.totalValue.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className={holding.gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                              ${holding.gainLoss.toFixed(2)} ({holding.gainLossPercent.toFixed(2)}%)
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Entry & Trade History */}
          <div className="space-y-6">
            {/* Order Entry */}
            <Card>
              <CardHeader>
                <CardTitle>Place Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Select onValueChange={handleStockSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a stock" />
                    </SelectTrigger>
                    <SelectContent>
                      {stocks.map((stock) => (
                        <SelectItem key={stock.symbol} value={stock.symbol}>
                          {stock.symbol} - ${stock.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStock && (
                  <>
                    <div className="space-y-2">
                      <Label>Order Type</Label>
                      <Select value={orderType} onValueChange={(value: "BUY" | "SELL") => setOrderType(value)}>
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
                      <Label>Shares</Label>
                      <Input
                        type="number"
                        value={orderShares}
                        onChange={(e) => setOrderShares(e.target.value)}
                        placeholder="Number of shares"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Price per Share</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        placeholder="Price per share"
                      />
                    </div>

                    {orderShares && orderPrice && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">
                          <strong>
                            Total: ${(Number.parseInt(orderShares) * Number.parseFloat(orderPrice)).toFixed(2)}
                          </strong>
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handlePlaceOrder}
                      className="w-full"
                      variant={orderType === "BUY" ? "default" : "destructive"}
                    >
                      {orderType} {selectedStock.symbol}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Trade History */}
            <Card>
              <CardHeader>
                <CardTitle>Trade History</CardTitle>
              </CardHeader>
              <CardContent>
                {trades.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No trades yet</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {trades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={trade.type === "BUY" ? "default" : "destructive"}>{trade.type}</Badge>
                            <span className="font-medium">{trade.symbol}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {trade.shares} shares @ ${trade.price.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">{trade.timestamp.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${trade.total.toFixed(2)}</p>
                          <Badge variant="outline" className="text-xs">
                            {trade.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
