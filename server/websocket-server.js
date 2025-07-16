const WebSocket = require("ws")
const http = require("http")

// Game state management
const games = new Map()

// Generate synthetic price history for 10 days
function generatePriceHistory() {
  const history = []
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
function createMarketMakers() {
  const marketMakers = []
  const names = ["Goldman MM", "Morgan MM", "Citadel MM", "Jane Street MM", "Virtu MM"]

  for (let i = 0; i < 5; i++) {
    marketMakers.push({
      id: `mm${i + 1}`,
      name: names[i],
      cash: 100000,
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

// Initialize game state
function initializeGame(gameId) {
  const priceHistory = generatePriceHistory()
  const lastDay = priceHistory[priceHistory.length - 1]

  return {
    currentRound: 1,
    phase: "LOBBY",
    players: [...createMarketMakers()],
    orders: [],
    trades: [],
    priceHistory,
    currentPrices: { CAMB: lastDay.cambridgeMining, OXFD: lastDay.oxfordWater },
    gameStarted: false,
  }
}

// Generate market maker orders
function generateMarketMakerOrders(gameState) {
  const mmOrders = []
  const marketMakers = gameState.players.filter((p) => p.isMarketMaker && !p.isDone)

  marketMakers.forEach((mm) => {
    const ordersToPlace = Math.floor(Math.random() * 4) + 2 // 2-5 orders per MM

    for (let i = 0; i < ordersToPlace && (mm.ordersSubmitted || 0) < 5; i++) {
      const stock = Math.random() > 0.5 ? "CAMB" : "OXFD"
      const currentPrice = gameState.currentPrices[stock]
      const type = Math.random() > 0.5 ? "BUY" : "SELL"

      let price
      if (type === "BUY") {
        price = currentPrice * (0.98 + Math.random() * 0.015)
      } else {
        price = currentPrice * (1.005 + Math.random() * 0.015)
      }

      price = Number(price.toFixed(2))
      const quantity = Math.floor(Math.random() * 150) + 50

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

    mm.isDone = true
  })

  return mmOrders
}

// Process orders and execute trades
function processOrders(allOrders) {
  const trades = []
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

function matchOrders(buyOrders, sellOrders, stock, trades, orders) {
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
        round: buyOrder.round,
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

// Calculate new prices based on executed trades
function calculateNewPrices(trades, currentPrices) {
  const newPrices = { ...currentPrices }

  const cambTrades = trades.filter((t) => t.stock === "CAMB")
  const oxfordTrades = trades.filter((t) => t.stock === "OXFD")

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

// Update player portfolios based on trades
function updatePlayerPortfolios(players, trades) {
  const updatedPlayers = [...players]

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

// Broadcast to all clients in a game
function broadcastToGame(gameId, message) {
  const game = games.get(gameId)
  if (game && game.clients) {
    game.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message))
      }
    })
  }
}

// Create HTTP server
const server = http.createServer()
const wss = new WebSocket.Server({ server })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const gameId = url.pathname.split('/').pop();
  
  console.log(`New connection to game: ${gameId}`);

  // Initialize game if it doesn't exist
  if (!games.has(gameId)) {
    games.set(gameId, {
      state: initializeGame(gameId),
      clients: new Set()
    });
  }

  const game = games.get(gameId);
  game.clients.add(ws);

  // Send current game state to new client
  ws.send(JSON.stringify({
    type: 'GAME_UPDATE',
    gameState: game.state
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`Received message:`, message);

      switch (message.type) {
        case 'PLAYER_JOIN':
          const newPlayer = {
            id: message.playerId,
            name: message.playerName,
            cash: 10000,
            cambridgeShares: 0,
            oxfordShares: 0,
            totalValue: 10000,
            isMonitor: message.isMonitor,
            ordersSubmitted: 0,
            isDone: false,
            isOnline: true,
          };

          game.state.players.push(newPlayer);
          
          broadcastToGame(gameId, {
            type: 'GAME_UPDATE',
            gameState: game.state
          });
          break;

        case 'GAME_START':
          const monitor = game.state.players.find(p => p.id === message.playerId && p.isMonitor);
          if (monitor) {
            game.state.phase = "SETUP";
            broadcastToGame(gameId, {
              type: 'GAME_UPDATE',
              gameState: game.state
            });
          }
          break;

        case 'ORDER_SUBMIT':
          const player = game.state.players.find(p => p.id === message.playerId);
          if (player && !player.isMonitor && (player.ordersSubmitted || 0) < 5) {
            const newOrder = {
              ...message.data,
              id: `${message.playerId}-${Date.now()}`,
              round: game.state.currentRound,
              status: "PENDING",
            };

            game.state.orders.push(newOrder);
            player.ordersSubmitted = (player.ordersSubmitted || 0) + 1;

            broadcastToGame(gameId, {
              type: 'GAME_UPDATE',
              gameState: game.state
            });
          }
          break;

        case 'PLAYER_DONE':
          const donePlayer = game.state.players.find(p => p.id === message.playerId);
          if (donePlayer) {
            donePlayer.isDone = true;
            broadcastToGame(gameId, {
              type: 'GAME_UPDATE',
              gameState: game.state
            });
          }
          break;

        case 'ROUND_PROCESS':
          const processingMonitor = game.state.players.find(p => p.id === message.playerId && p.isMonitor);
          if (processingMonitor) {
            game.state.phase = "PROCESSING";
            broadcastToGame(gameId, {
              type: 'GAME_UPDATE',
              gameState: game.state
            });

            // Process round after delay
            setTimeout(() => {
              // Generate market maker orders
              const mmOrders = generateMarketMakerOrders(game.state);
              const allOrders = [...game.state.orders, ...mmOrders];

              // Process orders and execute trades
              const { trades, orders } = processOrders(allOrders);

              // Calculate new prices
              const newPrices = calculateNewPrices(trades, game.state.currentPrices);

              // Update player portfolios
              const updatedPlayers = updatePlayerPortfolios(game.state.players, trades);

              // Update total values
              updatedPlayers.forEach(player => {
                player.totalValue = player.cash + 
                  player.cambridgeShares * newPrices.CAMB + 
                  player.oxfordShares * newPrices.OXFD;
              });

              // Add new price point to history if there were trades
              if (trades.length > 0) {
                game.state.priceHistory.push({
                  day: 10 + game.state.currentRound,
                  round: game.state.currentRound,
                  cambridgeMining: newPrices.CAMB,
                  oxfordWater: newPrices.OXFD,
                  isTradeDay: true,
                });
              }

              // Update game state
              game.state.orders = orders;
              game.state.trades = [...game.state.trades, ...trades];
              game.state.players = updatedPlayers;
              game.state.currentPrices = newPrices;
