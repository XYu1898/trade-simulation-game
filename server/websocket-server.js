const WebSocket = require("ws")

const wss = new WebSocket.Server({ port: 8080 })

const games = new Map() // Map to store game states: gameId -> gameState

wss.on("connection", (ws) => {
  console.log("Client connected")

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message)
      const { type, payload } = data

      switch (type) {
        case "create_game":
          handleCreateGame(ws, payload)
          break
        case "join_game":
          handleJoinGame(ws, payload)
          break
        case "start_game":
          handleStartGame(ws, payload)
          break
        case "submit_order":
          handleSubmitOrder(ws, payload)
          break
        case "end_round":
          handleEndRound(ws, payload)
          break
        default:
          ws.send(JSON.stringify({ type: "error", payload: { message: "Unknown message type" } }))
      }
    } catch (error) {
      console.error("Failed to parse message or handle action:", error)
      ws.send(JSON.stringify({ type: "error", payload: { message: "Invalid message format or internal error." } }))
    }
  })

  ws.on("close", () => {
    console.log("Client disconnected")
    // Handle player disconnection, e.g., remove from game or mark as offline
  })

  ws.on("error", (error) => {
    console.error("WebSocket error:", error)
  })
})

function handleCreateGame(ws, { gameId, playerName }) {
  if (games.has(gameId)) {
    ws.send(JSON.stringify({ type: "error", payload: { message: "Game ID already exists." } }))
    return
  }

  const playerId = `player-${Math.random().toString(36).substring(2, 8)}`
  const newPlayer = { id: playerId, name: playerName, balance: 10000, shares: 0, ws }

  const gameState = {
    players: [newPlayer],
    orders: [],
    trades: [],
    currentPrice: 100,
    priceHistory: [{ name: "Day 1", value: 100 }],
    currentRound: 1,
    gameStatus: "waiting", // waiting, active, finished
    roundDuration: 30, // seconds
    roundEndTime: null,
  }
  games.set(gameId, gameState)

  ws.playerId = playerId
  ws.gameId = gameId

  ws.send(JSON.stringify({ type: "player_id", payload: { playerId } }))
  broadcastGameState(gameId)
  console.log(`Game ${gameId} created by ${playerName} (${playerId})`)
}

function handleJoinGame(ws, { gameId, playerName }) {
  const gameState = games.get(gameId)
  if (!gameState) {
    ws.send(JSON.stringify({ type: "error", payload: { message: "Game ID not found." } }))
    return
  }

  const playerId = `player-${Math.random().toString(36).substring(2, 8)}`
  const newPlayer = { id: playerId, name: playerName, balance: 10000, shares: 0, ws }
  gameState.players.push(newPlayer)

  ws.playerId = playerId
  ws.gameId = gameId

  ws.send(JSON.stringify({ type: "player_id", payload: { playerId } }))
  broadcastGameState(gameId)
  console.log(`${playerName} (${playerId}) joined game ${gameId}`)
}

function handleStartGame(ws, { gameId, playerId }) {
  const gameState = games.get(gameId)
  if (!gameState) {
    ws.send(JSON.stringify({ type: "error", payload: { message: "Game not found." } }))
    return
  }

  if (gameState.gameStatus !== "waiting") {
    ws.send(JSON.stringify({ type: "error", payload: { message: "Game already started or finished." } }))
    return
  }

  gameState.gameStatus = "active"
  gameState.currentRound = 1
  gameState.priceHistory = [{ name: "Day 1", value: gameState.currentPrice }] // Reset price history
  gameState.orders = [] // Clear orders from previous games
  gameState.trades = [] // Clear trades from previous games
  startRound(gameId)
  broadcastGameState(gameId)
  console.log(`Game ${gameId} started by ${playerId}`)
}

function startRound(gameId) {
  const gameState = games.get(gameId)
  if (!gameState) return

  gameState.roundEndTime = Date.now() + gameState.roundDuration * 1000
  broadcastGameState(gameId)

  // Market maker places orders
  placeMarketMakerOrders(gameId)

  setTimeout(() => {
    processRound(gameId)
  }, gameState.roundDuration * 1000)
}

function placeMarketMakerOrders(gameId) {
  const gameState = games.get(gameId)
  if (!gameState) return

  const currentPrice = gameState.currentPrice
  const bidPrice = Math.max(1, currentPrice - Math.floor(Math.random() * 5) - 1) // -1 to -5
  const askPrice = currentPrice + Math.floor(Math.random() * 5) + 1 // +1 to +5
  const quantity = Math.floor(Math.random() * 10) + 1 // 1 to 10 shares

  // Market maker buy order
  gameState.orders.push({
    id: `order-mm-buy-${Date.now()}`,
    playerId: "market_maker",
    type: "buy",
    price: bidPrice,
    quantity: quantity,
    round: gameState.currentRound,
  })

  // Market maker sell order
  gameState.orders.push({
    id: `order-mm-sell-${Date.now()}`,
    playerId: "market_maker",
    type: "sell",
    price: askPrice,
    quantity: quantity,
    round: gameState.currentRound,
  })
  broadcastGameState(gameId)
}

function handleSubmitOrder(ws, { gameId, playerId, orderType, price, quantity }) {
  const gameState = games.get(gameId)
  if (!gameState) {
    ws.send(JSON.stringify({ type: "error", payload: { message: "Game not found." } }))
    return
  }

  if (gameState.gameStatus !== "active") {
    ws.send(JSON.stringify({ type: "error", payload: { message: "Game is not active." } }))
    return
  }

  const player = gameState.players.find((p) => p.id === playerId)
  if (!player) {
    ws.send(JSON.stringify({ type: "error", payload: { message: "Player not found." } }))
    return
  }

  // Ensure price and quantity are integers
  const parsedPrice = Number.parseInt(price)
  const parsedQuantity = Number.parseInt(quantity)

  if (isNaN(parsedPrice) || parsedPrice <= 0 || isNaN(parsedQuantity) || parsedQuantity <= 0) {
    ws.send(JSON.stringify({ type: "error", payload: { message: "Price and quantity must be positive integers." } }))
    return
  }

  if (orderType === "buy" && player.balance < parsedPrice * parsedQuantity) {
    ws.send(JSON.stringify({ type: "error", payload: { message: "Insufficient balance." } }))
    return
  }

  if (orderType === "sell" && player.shares < parsedQuantity) {
    ws.send(JSON.stringify({ type: "error", payload: { message: "Insufficient shares." } }))
    return
  }

  const newOrder = {
    id: `order-${Date.now()}-${playerId}`,
    playerId,
    type: orderType,
    price: parsedPrice,
    quantity: parsedQuantity,
    round: gameState.currentRound,
  }
  gameState.orders.push(newOrder)
  broadcastGameState(gameId)
  ws.send(JSON.stringify({ type: "notification", payload: { message: "Order submitted successfully!" } }))
}

function processRound(gameId) {
  const gameState = games.get(gameId)
  if (!gameState) return

  console.log(`Processing round ${gameState.currentRound} for game ${gameId}`)

  const buyOrders = gameState.orders
    .filter((o) => o.type === "buy" && o.round === gameState.currentRound)
    .sort((a, b) => b.price - a.price)
  const sellOrders = gameState.orders
    .filter((o) => o.type === "sell" && o.round === gameState.currentRound)
    .sort((a, b) => a.price - b.price)

  const newTrades = []
  let executedPrice = gameState.currentPrice // Default to current price if no trades

  while (buyOrders.length > 0 && sellOrders.length > 0 && buyOrders[0].price >= sellOrders[0].price) {
    const buyOrder = buyOrders[0]
    const sellOrder = sellOrders[0]

    const tradeQuantity = Math.min(buyOrder.quantity, sellOrder.quantity)
    const tradePrice = (buyOrder.price + sellOrder.price) / 2 // Mid-price for simplicity

    newTrades.push({
      id: `trade-${Date.now()}-${buyOrder.id}-${sellOrder.id}`,
      buyerId: buyOrder.playerId,
      sellerId: sellOrder.playerId,
      price: Math.round(tradePrice), // Ensure integer price
      quantity: tradeQuantity,
      round: gameState.currentRound,
    })

    // Update player balances and shares
    const buyer = gameState.players.find((p) => p.id === buyOrder.playerId)
    const seller = gameState.players.find((p) => p.id === sellOrder.playerId)

    if (buyer && buyer.id !== "market_maker") {
      buyer.balance -= Math.round(tradePrice) * tradeQuantity
      buyer.shares += tradeQuantity
    }
    if (seller && seller.id !== "market_maker") {
      seller.balance += Math.round(tradePrice) * tradeQuantity
      seller.shares -= tradeQuantity
    }

    // Update remaining quantities
    buyOrder.quantity -= tradeQuantity
    sellOrder.quantity -= tradeQuantity

    // Remove fulfilled orders
    if (buyOrder.quantity === 0) buyOrders.shift()
    if (sellOrder.quantity === 0) sellOrders.shift()

    executedPrice = Math.round(tradePrice)
  }

  // Update current price based on last trade or average of remaining orders
  if (newTrades.length > 0) {
    gameState.currentPrice = executedPrice
  } else if (buyOrders.length > 0 && sellOrders.length > 0) {
    // If no trades, price moves towards the middle of the best bid/ask
    gameState.currentPrice = Math.round((buyOrders[0].price + sellOrders[0].price) / 2)
  } else {
    // If only one side remains, price moves towards that side
    if (buyOrders.length > 0) {
      gameState.currentPrice = Math.round(buyOrders[0].price * 0.95) // Price drops if only buyers
    } else if (sellOrders.length > 0) {
      gameState.currentPrice = Math.round(sellOrders[0].price * 1.05) // Price rises if only sellers
    }
  }

  // Ensure price is always positive
  gameState.currentPrice = Math.max(1, gameState.currentPrice)

  gameState.trades.push(...newTrades)
  gameState.priceHistory.push({ name: `Day ${gameState.currentRound + 1}`, value: gameState.currentPrice })

  // Clear orders for the next round, keeping only unfulfilled parts if any
  gameState.orders = [...buyOrders, ...sellOrders].filter((order) => order.quantity > 0)

  gameState.currentRound++

  if (gameState.currentRound <= 10) {
    // Example: run for 10 rounds
    startRound(gameId)
  } else {
    gameState.gameStatus = "finished"
    console.log(`Game ${gameId} finished.`)
  }
  broadcastGameState(gameId)
}

function handleEndRound(ws, { gameId, playerId }) {
  const gameState = games.get(gameId)
  if (!gameState) {
    ws.send(JSON.stringify({ type: "error", payload: { message: "Game not found." } }))
    return
  }

  // For manual round ending, we can immediately process the round
  // In a real game, this might be restricted or trigger a timer reset
  processRound(gameId)
  ws.send(
    JSON.stringify({
      type: "notification",
      payload: { message: `Round ${gameState.currentRound - 1} ended manually.` },
    }),
  )
}

function broadcastGameState(gameId) {
  const gameState = games.get(gameId)
  if (!gameState) return

  const stateToSend = {
    ...gameState,
    players: gameState.players.map(({ ws, ...player }) => player), // Exclude ws object
  }

  gameState.players.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({ type: "game_state", payload: stateToSend }))
    }
  })
}

console.log("WebSocket server started on port 8080")
