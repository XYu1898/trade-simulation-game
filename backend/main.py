import asyncio
import json
import logging
import random
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
import websockets
from websockets.server import WebSocketServerProtocol
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Game state types
class Player:
    def __init__(self, player_id: str, name: str, is_monitor: bool = False, is_market_maker: bool = False):
        self.id = player_id
        self.name = name
        self.cash = 100000 if is_market_maker else 10000
        self.cambridge_shares = 1000 if is_market_maker else 0
        self.total_value = self.cash
        self.is_monitor = is_monitor
        self.is_market_maker = is_market_maker
        self.orders_submitted = 0
        self.is_done = False
        self.is_online = True
        self.rank = None

class Order:
    def __init__(self, order_id: str, player_id: str, player_name: str, stock: str, 
                 order_type: str, price: int, quantity: int, round_num: int):
        self.id = order_id
        self.player_id = player_id
        self.player_name = player_name
        self.stock = stock
        self.type = order_type
        self.price = price
        self.quantity = quantity
        self.round = round_num
        self.status = "PENDING"
        self.filled_quantity = 0

class Trade:
    def __init__(self, trade_id: str, stock: str, price: int, quantity: int, 
                 buyer_id: str, seller_id: str, round_num: int):
        self.id = trade_id
        self.stock = stock
        self.price = price
        self.quantity = quantity
        self.buyer_id = buyer_id
        self.seller_id = seller_id
        self.round = round_num

class PricePoint:
    def __init__(self, day: int, camb_price: int, 
                 round_num: Optional[int] = None, is_trade_day: bool = False):
        self.day = day
        self.cambridge_mining = camb_price
        self.round = round_num
        self.is_trade_day = is_trade_day

class GameState:
    def __init__(self):
        self.current_round = 1
        self.phase = "LOBBY"  # LOBBY, SETUP, TRADING, PROCESSING, RESULTS, FINISHED
        self.players: Dict[str, Player] = {}
        self.orders: List[Order] = []
        self.trades: List[Trade] = []
        self.price_history: List[PricePoint] = []
        self.current_prices = {"CAMB": 0}
        self.game_started = False
        self.websockets: Dict[str, WebSocket] = {}
        
        # Initialize with market makers and price history
        self._create_market_makers()
        self._generate_price_history()

    def _create_market_makers(self):
        """Create AI market makers"""
        mm_names = ["Goldman MM", "Morgan MM", "Citadel MM", "Jane Street MM", "Virtu MM"]
        for i, name in enumerate(mm_names):
            mm_id = f"mm{i+1}"
            self.players[mm_id] = Player(mm_id, name, is_market_maker=True)

    def _generate_price_history(self):
        """Generate synthetic price history for 10 days with V-shape recovery"""
        # Start at a high price
        start_price = 75
        
        # Create V-shape: decline for first 5 days, then recover for next 5 days
        prices = []
        
        # Decline phase (days 1-5)
        current_price = start_price
        for day in range(1, 6):
            # Steep decline with some volatility
            decline_amount = random.randint(4, 8) # Decline by 4-8 dollars
            volatility = random.randint(-2, 2) # Add some noise
            current_price = current_price - decline_amount + volatility
            current_price = max(30, current_price) # Don't go below $30
            prices.append((day, int(current_price)))
        
        # Recovery phase (days 6-10)
        for day in range(6, 11):
            # Strong recovery with volatility
            recovery_amount = random.randint(5, 10) # Recover by 5-10 dollars
            volatility = random.randint(-3, 3) # Add some noise
            current_price = current_price + recovery_amount + volatility
            current_price = min(100, current_price) # Cap at $100
            prices.append((day, int(current_price)))
        
        # Create price history
        for day, price in prices:
            self.price_history.append(PricePoint(day, price))
        
        # Set current price from last day
        self.current_prices = {"CAMB": prices[-1][1]}

    def add_player(self, player_id: str, name: str, is_monitor: bool = False):
        """Add a new player to the game"""
        self.players[player_id] = Player(player_id, name, is_monitor)
        logger.info(f"Player {name} ({'Monitor' if is_monitor else 'Player'}) joined the game")

    def add_websocket(self, player_id: str, websocket: WebSocket):
        """Associate a websocket with a player"""
        self.websockets[player_id] = websocket

    def remove_websocket(self, player_id: str):
        """Remove websocket association"""
        if player_id in self.websockets:
            del self.websockets[player_id]

    def get_human_players(self) -> List[Player]:
        """Get all human players (non-market makers)"""
        return [p for p in self.players.values() if not p.is_market_maker]

    def can_process_round(self) -> bool:
        """Check if round can be processed (all human players done or max orders)"""
        human_players = self.get_human_players()
        non_monitor_players = [p for p in human_players if not p.is_monitor]
        return all(p.is_done or p.orders_submitted >= 2 for p in non_monitor_players)

    def force_close_orders(self):
        """Force close order submission for all players"""
        for player in self.players.values():
            if not player.is_market_maker:
                player.is_done = True

    def generate_market_maker_orders(self) -> List[Order]:
        """Generate orders for market makers"""
        mm_orders = []
        
        for player in self.players.values():
            if not player.is_market_maker or player.is_done:
                continue
                
            # Market makers place 2-4 orders
            orders_to_place = random.randint(2, min(4, 2 - player.orders_submitted)) # Max 2 orders for MM too
            
            for i in range(orders_to_place):
                current_price = self.current_prices["CAMB"]
                order_type = random.choice(["BUY", "SELL"])
                
                # Market makers quote around current price with +/- $5 spread
                if order_type == "BUY":
                    price = current_price - random.randint(1, 5)
                else:
                    price = current_price + random.randint(1, 5)
                
                price = max(1, price) # Ensure price is at least 1
                quantity = random.randint(50, 150)
                
                # Check if MM can place this order
                can_place = True
                if order_type == "BUY":
                    can_place = player.cash >= price * quantity
                else:
                    can_place = player.cambridge_shares >= quantity
                
                if can_place:
                    order_id = f"{player.id}-CAMB-{int(time.time())}-{i}"
                    order = Order(order_id, player.id, player.name, "CAMB", 
                                order_type, price, quantity, self.current_round)
                    mm_orders.append(order)
                    player.orders_submitted += 1
            
            player.is_done = True
        
        return mm_orders

    def process_orders(self) -> List[Trade]:
        """Process all pending orders and execute trades"""
        trades = []
        
        # Get CAMB orders
        camb_buys = [o for o in self.orders if o.stock == "CAMB" and o.type == "BUY" and o.status == "PENDING"]
        camb_sells = [o for o in self.orders if o.stock == "CAMB" and o.type == "SELL" and o.status == "PENDING"]
        
        # Sort orders (best prices first)
        camb_buys.sort(key=lambda x: x.price, reverse=True)
        camb_sells.sort(key=lambda x: x.price)
        
        # Match orders
        trades.extend(self._match_orders(camb_buys, camb_sells, "CAMB"))
        
        return trades

    def _match_orders(self, buy_orders: List[Order], sell_orders: List[Order], stock: str) -> List[Trade]:
        """Match buy and sell orders for a specific stock"""
        trades = []
        buy_idx = 0
        sell_idx = 0
        
        while buy_idx < len(buy_orders) and sell_idx < len(sell_orders):
            buy_order = buy_orders[buy_idx]
            sell_order = sell_orders[sell_idx]
            
            if buy_order.price >= sell_order.price:
                # Execute trade
                trade_price = sell_order.price # Trade at seller's price
                trade_quantity = min(buy_order.quantity, sell_order.quantity)
                
                trade_id = f"trade-{int(time.time())}-{random.randint(1000, 9999)}"
                trade = Trade(trade_id, stock, trade_price, trade_quantity,
                            buy_order.player_id, sell_order.player_id, self.current_round)
                trades.append(trade)
                
                # Update order quantities
                buy_order.quantity -= trade_quantity
                sell_order.quantity -= trade_quantity
                buy_order.filled_quantity += trade_quantity
                sell_order.filled_quantity += trade_quantity
                
                # Update order status
                if buy_order.quantity == 0:
                    buy_order.status = "FILLED"
                else:
                    buy_order.status = "PARTIAL"
                    
                if sell_order.quantity == 0:
                    sell_order.status = "FILLED"
                else:
                    sell_order.status = "PARTIAL"
                
                # Move to next order if fully filled
                if buy_order.quantity == 0:
                    buy_idx += 1
                if sell_order.quantity == 0:
                    sell_idx += 1
            else:
                sell_idx += 1
        
        return trades

    def update_player_portfolios(self, trades: List[Trade]):
        """Update player portfolios based on executed trades"""
        for trade in trades:
            buyer = self.players.get(trade.buyer_id)
            seller = self.players.get(trade.seller_id)
            
            if buyer and seller:
                total_cost = trade.price * trade.quantity
                
                # Update buyer
                buyer.cash -= total_cost
                buyer.cambridge_shares += trade.quantity
                
                # Update seller
                seller.cash += total_cost
                seller.cambridge_shares -= trade.quantity

    def calculate_new_prices(self, trades: List[Trade]) -> Dict[str, int]:
        """Calculate new prices based on executed trades"""
        new_prices = self.current_prices.copy()
        
        # Calculate volume-weighted average price for CAMB
        camb_trades = [t for t in trades if t.stock == "CAMB"]
        if camb_trades:
            total_volume = sum(t.quantity for t in camb_trades)
            total_value = sum(t.price * t.quantity for t in camb_trades)
            new_prices["CAMB"] = int(round(total_value / total_volume))
        
        return new_prices

    def update_total_values(self):
        """Update total portfolio values for all players"""
        for player in self.players.values():
            player.total_value = (player.cash + 
                                player.cambridge_shares * self.current_prices["CAMB"])

    def to_dict(self) -> Dict[str, Any]:
        """Convert game state to dictionary for JSON serialization"""
        return {
            "currentRound": self.current_round,
            "phase": self.phase,
            "players": [
                {
                    "id": p.id,
                    "name": p.name,
                    "cash": p.cash,
                    "cambridgeShares": p.cambridge_shares,
                    "totalValue": p.total_value,
                    "rank": p.rank,
                    "isMarketMaker": p.is_market_maker,
                    "isMonitor": p.is_monitor,
                    "ordersSubmitted": p.orders_submitted,
                    "isDone": p.is_done,
                    "isOnline": p.is_online
                }
                for p in self.players.values()
            ],
            "orders": [
                {
                    "id": o.id,
                    "playerId": o.player_id,
                    "playerName": o.player_name,
                    "stock": o.stock,
                    "type": o.type,
                    "price": o.price,
                    "quantity": o.quantity,
                    "round": o.round,
                    "status": o.status,
                    "filledQuantity": o.filled_quantity
                }
                for o in self.orders
            ],
            "trades": [
                {
                    "id": t.id,
                    "stock": t.stock,
                    "price": t.price,
                    "quantity": t.quantity,
                    "buyerId": t.buyer_id,
                    "sellerId": t.seller_id,
                    "round": t.round
                }
                for t in self.trades
            ],
            "priceHistory": [
                {
                    "day": p.day,
                    "round": p.round,
                    "cambridgeMining": p.cambridge_mining,
                    "isTradeDay": p.is_trade_day
                }
                for p in self.price_history
            ],
            "currentPrices": self.current_prices,
            "gameStarted": self.game_started
        }

# Global game state
game_state = GameState()

# FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def broadcast_game_update():
    """Broadcast game state update to all connected clients"""
    if not game_state.websockets:
        return
    
    message = {
        "type": "GAME_UPDATE",
        "gameState": game_state.to_dict()
    }
    
    # Send to all connected websockets
    disconnected = []
    for player_id, websocket in game_state.websockets.items():
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending to {player_id}: {e}")
            disconnected.append(player_id)
    
    # Clean up disconnected websockets
    for player_id in disconnected:
        game_state.remove_websocket(player_id)

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await websocket.accept()
    player_id = None
    
    try:
        # Send initial game state
        await websocket.send_text(json.dumps({
            "type": "GAME_UPDATE",
            "gameState": game_state.to_dict()
        }))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            logger.info(f"Received message: {message['type']}")
            
            if message["type"] == "PLAYER_JOIN":
                player_id = message["playerId"]
                player_name = message["playerName"]
                is_monitor = message.get("isMonitor", False)
                
                game_state.add_player(player_id, player_name, is_monitor)
                game_state.add_websocket(player_id, websocket)
                
                await broadcast_game_update()
                
            elif message["type"] == "GAME_START":
                player = game_state.players.get(message["playerId"])
                if player and player.is_monitor:
                    game_state.phase = "TRADING" # Set to TRADING for Round 1
                    await broadcast_game_update()
                    
            elif message["type"] == "ORDER_SUBMIT":
                player = game_state.players.get(message["playerId"])
                if player and not player.is_monitor and player.orders_submitted < 2:
                    order_data = message["data"]
                    order_id = f"{message['playerId']}-{int(time.time())}"
                    
                    order = Order(
                        order_id,
                        order_data["playerId"],
                        order_data["playerName"],
                        order_data["stock"],
                        order_data["type"],
                        order_data["price"],
                        order_data["quantity"],
                        game_state.current_round
                    )
                    
                    game_state.orders.append(order)
                    player.orders_submitted += 1
                    
                    await broadcast_game_update()
                    
            elif message["type"] == "PLAYER_DONE":
                player = game_state.players.get(message["playerId"])
                if player:
                    player.is_done = True
                    await broadcast_game_update()
                    
            elif message["type"] == "FORCE_CLOSE_ORDERS":
                player = game_state.players.get(message["playerId"])
                if player and player.is_monitor:
                    game_state.force_close_orders()
                    await broadcast_game_update()
                    
            elif message["type"] == "ROUND_PROCESS":
                player = game_state.players.get(message["playerId"])
                if player and player.is_monitor:
                    await process_round()
                    
            elif message["type"] == "NEXT_ROUND":
                player = game_state.players.get(message["playerId"])
                if player and player.is_monitor:
                    await next_round()
                    
    except WebSocketDisconnect:
        logger.info(f"Player {player_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if player_id:
            game_state.remove_websocket(player_id)

async def process_round():
    """Process the current round"""
    game_state.phase = "PROCESSING"
    await broadcast_game_update()
    
    # Wait a bit for UI update
    await asyncio.sleep(2)
    
    # Generate market maker orders
    mm_orders = game_state.generate_market_maker_orders()
    game_state.orders.extend(mm_orders)
    
    # Process all orders and execute trades
    new_trades = game_state.process_orders()
    game_state.trades.extend(new_trades)
    
    # Calculate new prices
    new_prices = game_state.calculate_new_prices(new_trades)
    game_state.current_prices = new_prices
    
    # Update player portfolios
    game_state.update_player_portfolios(new_trades)
    game_state.update_total_values()
    
    # Add new price point to history if there were trades
    if new_trades:
        game_state.price_history.append(PricePoint(
            10 + game_state.current_round, # Continue day count
            new_prices["CAMB"],
            game_state.current_round,
            True
        ))
    
    game_state.phase = "RESULTS"
    await broadcast_game_update()

async def next_round():
    """Move to the next round or finish the game"""
    if game_state.current_round >= 10:
        # Game finished - calculate final rankings
        human_players = game_state.get_human_players()
        non_monitor_players = [p for p in human_players if not p.is_monitor]
        non_monitor_players.sort(key=lambda x: x.total_value, reverse=True)
        
        for i, player in enumerate(non_monitor_players):
            player.rank = i + 1
        
        game_state.phase = "FINISHED"
    else:
        # Next round
        game_state.current_round += 1
        game_state.phase = "TRADING"
        
        # Reset player states for new round
        for player in game_state.players.values():
            player.orders_submitted = 0
            player.is_done = False
        
        # Remove filled orders, keep pending ones
        game_state.orders = [o for o in game_state.orders if o.status == "PENDING"]
    
    await broadcast_game_update()

@app.get("/")
async def root():
    return {"message": "Trading Simulation Game Backend", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "players": len(game_state.players)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
