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
    def __init__(self, player_id: str, name: str, is_monitor: bool = False):
        self.id = player_id
        self.name = name
        self.cash = 10000
        self.cambridge_shares = 200 if not is_monitor else 0  # Give 200 shares to players, 0 to monitors
        self.total_value = self.cash
        self.is_monitor = is_monitor
        self.orders_submitted = 0
        self.is_done = False
        self.is_online = True
        self.rank = None

class Order:
    def __init__(self, order_id: str, player_id: str, player_name: str, stock: str, 
                 order_type: str, price: int, quantity: int, round_num: int):  # price is now int
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
                 buyer_id: str, seller_id: str, round_num: int):  # price is now int
        self.id = trade_id
        self.stock = stock
        self.price = price
        self.quantity = quantity
        self.buyer_id = buyer_id
        self.seller_id = seller_id
        self.round = round_num

class PricePoint:
    def __init__(self, day: int, camb_price: int, 
                 round_num: Optional[int] = None, is_trade_day: bool = False):  # price is now int
        self.day = day
        self.cambridge_mining = camb_price
        self.round = round_num
        self.is_trade_day = is_trade_day

class GameState:
    def __init__(self):
        self.current_round = 1
        self.phase = "LOBBY"  # LOBBY, SETUP, TRADING, PROCESSING, RESULTS, FINISHED
        self.players: Dict[str, Player] = {}
        self.orders: List[Order] = []  # Current round orders
        self.trades: List[Trade] = []
        self.price_history: List[PricePoint] = []
        self.current_prices = {"CAMB": 50}  # Set initial price to 50
        self.game_started = False
        self.websockets: Dict[str, WebSocket] = {}
        self.consolidated_orders: Dict[str, Dict] = {"BUY": {}, "SELL": {}}  # For displaying consolidated orders
        self.previous_round_orders: List[Order] = []  # Store ALL orders from previous round (pending + executed)
        
        # Initialize price history
        self._generate_price_history()

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
            decline = random.uniform(8, 12)  # 8-12% decline per day
            volatility = random.uniform(-2, 2)  # Add some noise
            current_price = current_price * (1 - decline/100 + volatility/100)
            current_price = max(30, current_price)  # Don't go below $30
            prices.append((day, int(round(current_price))))
        
        # Recovery phase (days 6-10)
        for day in range(6, 11):
            # Strong recovery with volatility
            recovery = random.uniform(10, 15)  # 10-15% recovery per day
            volatility = random.uniform(-3, 3)  # Add some noise
            current_price = current_price * (1 + recovery/100 + volatility/100)
            current_price = min(100, current_price)  # Cap at $100
            prices.append((day, int(round(current_price))))
        
        # Create price history
        for day, price in prices:
            self.price_history.append(PricePoint(day, price))
        
        # Set current price to 50 (override the generated price)
        self.current_prices = {"CAMB": 50}

    def add_player(self, player_id: str, name: str, is_monitor: bool = False):
        """Add a new player to the game"""
        self.players[player_id] = Player(player_id, name, is_monitor)
        # Update total value to include initial shares
        if not is_monitor:
            self.players[player_id].total_value = self.players[player_id].cash + (self.players[player_id].cambridge_shares * self.current_prices["CAMB"])
        logger.info(f"Player {name} ({'Monitor' if is_monitor else 'Player'}) joined the game")

    def add_websocket(self, player_id: str, websocket: WebSocket):
        """Associate a websocket with a player"""
        self.websockets[player_id] = websocket

    def remove_websocket(self, player_id: str):
        """Remove websocket association"""
        if player_id in self.websockets:
            del self.websockets[player_id]

    def get_human_players(self) -> List[Player]:
        """Get all human players"""
        return [p for p in self.players.values()]

    def can_process_round(self) -> bool:
        """Check if round can be processed (all human players done or max orders)"""
        human_players = [p for p in self.players.values() if not p.is_monitor]
        return all(p.is_done or p.orders_submitted >= 2 for p in human_players)

    def force_close_orders(self):
        """Force close order submission for all players"""
        for player in self.players.values():
            if not player.is_monitor:
                player.is_done = True

    def consolidate_orders_from_previous_round(self):
        """Consolidate ALL orders from the previous round for display (both pending and executed)"""
        self.consolidated_orders = {"BUY": {}, "SELL": {}}
        
        # Use ALL orders from previous round (both pending and executed)
        orders_to_consolidate = self.previous_round_orders
        
        for order in orders_to_consolidate:
            if order.stock == "CAMB":
                order_type = order.type
                price = order.price
                
                if price not in self.consolidated_orders[order_type]:
                    self.consolidated_orders[order_type][price] = 0
                
                # Add the original quantity (not remaining quantity)
                original_quantity = order.quantity + (order.filled_quantity or 0)
                self.consolidated_orders[order_type][price] += original_quantity

    def process_orders(self) -> List[Trade]:
        """Process all pending orders and execute trades"""
        trades = []
        
        # Get CAMB orders from current round
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
            
            # Only execute if bid price >= ask price
            if buy_order.price >= sell_order.price:
                # Execute trade at the ask price (seller's price)
                trade_price = sell_order.price
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
                # No more matches possible
                break
        
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
            vwap = total_value / total_volume
            new_prices["CAMB"] = int(round(vwap))  # Round to nearest integer
        
        return new_prices

    def update_total_values(self):
        """Update total portfolio values for all players"""
        for player in self.players.values():
            player.total_value = (player.cash + 
                                player.cambridge_shares * self.current_prices["CAMB"])

    def get_player_trades(self, player_id: str) -> List[Trade]:
        """Get trades for a specific player"""
        return [t for t in self.trades if t.buyer_id == player_id or t.seller_id == player_id]

    def to_dict(self, requesting_player_id: str = None) -> Dict[str, Any]:
        """Convert game state to dictionary for JSON serialization"""
        # Get player-specific trades if requesting_player_id is provided
        if requesting_player_id:
            player_trades = self.get_player_trades(requesting_player_id)
            requesting_player = self.players.get(requesting_player_id)
            is_monitor = requesting_player.is_monitor if requesting_player else False
        else:
            player_trades = []
            is_monitor = False
        
        # Only show orders to monitor during trading phase
        orders_to_show = []
        if is_monitor and self.phase == "TRADING":
            orders_to_show = [
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
                for o in self.orders if o.status == "PENDING"
            ]
        
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
                    "isMarketMaker": False,  # No market makers
                    "isMonitor": p.is_monitor,
                    "ordersSubmitted": p.orders_submitted,
                    "isDone": p.is_done,
                    "isOnline": p.is_online
                }
                for p in self.players.values()
            ],
            "orders": orders_to_show,
            "consolidatedOrders": self.consolidated_orders,
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
                for t in player_trades  # Only show player's own trades
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
    
    # Send personalized updates to each player
    disconnected = []
    for player_id, websocket in game_state.websockets.items():
        try:
            message = {
                "type": "GAME_UPDATE",
                "gameState": game_state.to_dict(player_id)
            }
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
                    game_state.phase = "SETUP"
                    await broadcast_game_update()
                    
            elif message["type"] == "START_TRADING":
                player = game_state.players.get(message["playerId"])
                if player and player.is_monitor:
                    game_state.phase = "TRADING"
                    # Reset all player states for trading
                    for p in game_state.players.values():
                        if not p.is_monitor:
                            p.orders_submitted = 0
                            p.is_done = False
                    
                    # Clear current round orders (start fresh)
                    game_state.orders = []
                    
                    # Consolidate orders from previous round for display (if round > 1)
                    if game_state.current_round > 1:
                        game_state.consolidate_orders_from_previous_round()
                    
                    await broadcast_game_update()
                    
            elif message["type"] == "ORDER_SUBMIT":
                player = game_state.players.get(message["playerId"])
                if player and not player.is_monitor and player.orders_submitted < 2 and game_state.phase == "TRADING":
                    order_data = message["data"]
                    order_id = f"{message['playerId']}-{int(time.time())}-{random.randint(100, 999)}"
                    
                    # Ensure price is integer
                    price = int(order_data["price"])
                    
                    order = Order(
                        order_id,
                        order_data["playerId"],
                        order_data["playerName"],
                        order_data["stock"],
                        order_data["type"],
                        price,
                        order_data["quantity"],
                        game_state.current_round
                    )
                    
                    game_state.orders.append(order)
                    player.orders_submitted += 1
                    
                    await broadcast_game_update()
                    
            elif message["type"] == "PLAYER_DONE":
                player = game_state.players.get(message["playerId"])
                if player and game_state.phase == "TRADING":
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
    
    # Store ALL current orders as previous round orders before processing
    # This includes both the original quantities and any partial fills
    game_state.previous_round_orders = []
    for order in game_state.orders:
        # Create a copy of the order with original quantities for display
        order_copy = Order(
            order.id,
            order.player_id,
            order.player_name,
            order.stock,
            order.type,
            order.price,
            order.quantity + (order.filled_quantity or 0),  # Original quantity
            order.round
        )
        order_copy.status = order.status
        order_copy.filled_quantity = order.filled_quantity or 0
        game_state.previous_round_orders.append(order_copy)
    
    # Process all orders and execute trades
    new_trades = game_state.process_orders()
    game_state.trades.extend(new_trades)
    
    # Calculate new prices based on trades
    new_prices = game_state.calculate_new_prices(new_trades)
    game_state.current_prices = new_prices
    
    # Update player portfolios
    game_state.update_player_portfolios(new_trades)
    game_state.update_total_values()
    
    # Add new price point to history if there were trades
    if new_trades:
        game_state.price_history.append(PricePoint(
            10 + game_state.current_round,
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
        human_players = [p for p in game_state.players.values() if not p.is_monitor]
        human_players.sort(key=lambda x: x.total_value, reverse=True)
        
        for i, player in enumerate(human_players):
            player.rank = i + 1
        
        game_state.phase = "FINISHED"
    else:
        # Next round
        game_state.current_round += 1
        game_state.phase = "TRADING"
        
        # Reset player states for new round
        for player in game_state.players.values():
            if not player.is_monitor:
                player.orders_submitted = 0
                player.is_done = False
        
        # Clear current round orders (start fresh - no carryover)
        game_state.orders = []
        
        # Consolidate orders from previous round for display
        game_state.consolidate_orders_from_previous_round()
    
    await broadcast_game_update()

@app.get("/")
async def root():
    return {"message": "Trading Simulation Game Backend", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "players": len(game_state.players)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
