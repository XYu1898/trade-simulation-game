from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import random
import time

app = FastAPI()

# Allow all origins for simplicity in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for game states and connected players
games = {}  # game_id -> GameState
player_connections = {} # player_id -> WebSocket

class GameState:
    def __init__(self, game_id: str, initial_player_name: str):
        self.game_id = game_id
        self.players = {
            f"player-{random.randint(1000, 9999)}": {
                "name": initial_player_name,
                "balance": 10000,
                "shares": 0,
            }
        }
        self.orders = []
        self.trades = []
        self.current_price = 100
        self.price_history = [{"name": "Day 1", "value": 100}]
        self.current_round = 1
        self.game_status = "waiting"  # waiting, active, finished
        self.round_duration = 30  # seconds
        self.round_end_time = None
        self.round_timer_task = None
        self.market_maker_id = "market_maker"
        self.players[self.market_maker_id] = {"name": "Market Maker", "balance": float('inf'), "shares": float('inf')}

    def to_dict(self):
        return {
            "gameId": self.game_id,
            "players": list(self.players.values()),
            "orders": self.orders,
            "trades": self.trades,
            "currentPrice": self.current_price,
            "priceHistory": self.price_history,
            "currentRound": self.current_round,
            "gameStatus": self.game_status,
            "roundDuration": self.round_duration,
            "roundEndTime": self.round_end_time,
        }

async def broadcast_game_state(game_id: str):
    game = games.get(game_id)
    if not game:
        return

    state_to_send = game.to_dict()
    for player_id, player_data in game.players.items():
        if player_id != game.market_maker_id: # Don't send to market maker's non-existent WS
            ws = player_connections.get(player_id)
            if ws:
                try:
                    await ws.send_json({"type": "game_state", "payload": state_to_send})
                except RuntimeError as e:
                    print(f"Error sending to player {player_id}: {e}")
                    # Consider removing disconnected player or marking them offline

async def start_round_timer(game_id: str):
    game = games.get(game_id)
    if not game:
        return

    game.round_end_time = int(time.time() * 1000) + game.round_duration * 1000
    await broadcast_game_state(game_id)

    # Market maker places orders at the start of the round
    await place_market_maker_orders(game_id)

    await asyncio.sleep(game.round_duration)
    await process_round(game_id)

async def place_market_maker_orders(game_id: str):
    game = games.get(game_id)
    if not game:
        return

    current_price = game.current_price
    # Ensure bid and ask prices are integers and within +/- 5 range
    bid_price = max(1, current_price - random.randint(1, 5))
    ask_price = current_price + random.randint(1, 5)
    quantity = random.randint(1, 10) # 1 to 10 shares

    # Market maker buy order
    game.orders.append({
        "id": f"order-mm-buy-{int(time.time() * 1000)}",
        "playerId": game.market_maker_id,
        "type": "buy",
        "price": bid_price,
        "quantity": quantity,
        "round": game.current_round,
    })

    # Market maker sell order
    game.orders.append({
        "id": f"order-mm-sell-{int(time.time() * 1000)}",
        "playerId": game.market_maker_id,
        "type": "sell",
        "price": ask_price,
        "quantity": quantity,
        "round": game.current_round,
    })
    await broadcast_game_state(game_id)


async def process_round(game_id: str):
    game = games.get(game_id)
    if not game:
        return

    print(f"Processing round {game.current_round} for game {game_id}")

    # Filter orders for the current round and sort them
    current_round_orders = [order for order in game.orders if order["round"] == game.current_round]
    buy_orders = sorted([o for o in current_round_orders if o["type"] == "buy"], key=lambda x: x["price"], reverse=True)
    sell_orders = sorted([o for o in current_round_orders if o["type"] == "sell"], key=lambda x: x["price"])

    new_trades = []
    executed_price = game.current_price  # Default to current price if no trades

    while buy_orders and sell_orders and buy_orders[0]["price"] >= sell_orders[0]["price"]:
        buy_order = buy_orders[0]
        sell_order = sell_orders[0]

        trade_quantity = min(buy_order["quantity"], sell_order["quantity"])
        trade_price = (buy_order["price"] + sell_order["price"]) / 2
        
        # Ensure trade price is an integer
        trade_price = int(round(trade_price))

        new_trades.append({
            "id": f"trade-{int(time.time() * 1000)}-{buy_order['id']}-{sell_order['id']}",
            "buyerId": buy_order["playerId"],
            "sellerId": sell_order["playerId"],
            "price": trade_price,
            "quantity": trade_quantity,
            "round": game.current_round,
        })

        # Update player balances and shares
        buyer_data = game.players.get(buy_order["playerId"])
        seller_data = game.players.get(sell_order["playerId"])

        if buyer_data and buy_order["playerId"] != game.market_maker_id:
            buyer_data["balance"] -= trade_price * trade_quantity
            buyer_data["shares"] += trade_quantity
        if seller_data and sell_order["playerId"] != game.market_maker_id:
            seller_data["balance"] += trade_price * trade_quantity
            seller_data["shares"] -= trade_quantity

        # Update remaining quantities
        buy_order["quantity"] -= trade_quantity
        sell_order["quantity"] -= trade_quantity

        # Remove fulfilled orders
        if buy_order["quantity"] == 0:
            buy_orders.pop(0)
        if sell_order["quantity"] == 0:
            sell_orders.pop(0)

        executed_price = trade_price

    # Update current price based on last trade or average of remaining orders
    if new_trades:
        game.current_price = executed_price
    elif buy_orders and sell_orders:
        # If no trades, price moves towards the middle of the best bid/ask
        game.current_price = int(round((buy_orders[0]["price"] + sell_orders[0]["price"]) / 2))
    else:
        # If only one side remains, price moves towards that side
        if buy_orders:
            game.current_price = int(round(buy_orders[0]["price"] * 0.95))  # Price drops if only buyers
        elif sell_orders:
            game.current_price = int(round(sell_orders[0]["price"] * 1.05))  # Price rises if only sellers
    
    # Ensure price is always positive
    game.current_price = max(1, game.current_price)

    game.trades.extend(new_trades)
    game.price_history.append({"name": f"Day {game.current_round + 1}", "value": game.current_price})

    # Clear orders for the next round, keeping only unfulfilled parts if any
    # This ensures only orders from the current round are processed and displayed
    game.orders = [order for order in game.orders if order["quantity"] > 0 and order["round"] == game.current_round]


    game.current_round += 1

    if game.current_round <= 10:  # Example: run for 10 rounds
        game.round_timer_task = asyncio.create_task(start_round_timer(game_id))
    else:
        game.game_status = "finished"
        print(f"Game {game_id} finished.")
    
    await broadcast_game_state(game_id)


@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await websocket.accept()
    player_id = None
    try:
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")
            payload = message.get("payload")

            if msg_type == "create_game":
                if game_id in games:
                    await websocket.send_json({"type": "error", "payload": {"message": "Game ID already exists."}})
                    continue
                
                new_game = GameState(game_id, payload["playerName"])
                games[game_id] = new_game
                player_id = list(new_game.players.keys())[0] # Get the first player ID
                player_connections[player_id] = websocket
                await websocket.send_json({"type": "player_id", "payload": {"playerId": player_id}})
                await broadcast_game_state(game_id)
                print(f"Game {game_id} created by {payload['playerName']} ({player_id})")

            elif msg_type == "join_game":
                if game_id not in games:
                    await websocket.send_json({"type": "error", "payload": {"message": "Game ID not found."}})
                    continue
                
                game = games[game_id]
                if game.game_status != "waiting":
                    await websocket.send_json({"type": "error", "payload": {"message": "Game already started or finished."}})
                    continue

                player_id = f"player-{random.randint(1000, 9999)}"
                game.players[player_id] = {"name": payload["playerName"], "balance": 10000, "shares": 0}
                player_connections[player_id] = websocket
                await websocket.send_json({"type": "player_id", "payload": {"playerId": player_id}})
                await broadcast_game_state(game_id)
                print(f"{payload['playerName']} ({player_id}) joined game {game_id}")

            elif msg_type == "start_game":
                game = games.get(game_id)
                if not game:
                    await websocket.send_json({"type": "error", "payload": {"message": "Game not found."}})
                    continue
                if game.game_status != "waiting":
                    await websocket.send_json({"type": "error", "payload": {"message": "Game already started or finished."}})
                    continue
                
                game.game_status = "active"
                game.current_round = 1
                game.price_history = [{"name": "Day 1", "value": game.current_price}] # Reset price history
                game.orders = [] # Clear orders from previous games
                game.trades = [] # Clear trades from previous games
                game.round_timer_task = asyncio.create_task(start_round_timer(game_id))
                await broadcast_game_state(game_id)
                print(f"Game {game_id} started by {payload['playerId']}")

            elif msg_type == "submit_order":
                game = games.get(game_id)
                if not game:
                    await websocket.send_json({"type": "error", "payload": {"message": "Game not found."}})
                    continue
                if game.game_status != "active":
                    await websocket.send_json({"type": "error", "payload": {"message": "Game is not active."}})
                    return

                player_data = game.players.get(payload["playerId"])
                if not player_data:
                    await websocket.send_json({"type": "error", "payload": {"message": "Player not found."}})
                    return

                price = int(payload["price"]) # Ensure integer
                quantity = int(payload["quantity"]) # Ensure integer

                if price <= 0 or quantity <= 0:
                    await websocket.send_json({"type": "error", "payload": {"message": "Price and quantity must be positive integers."}})
                    return

                if payload["orderType"] == "buy" and player_data["balance"] < price * quantity:
                    await websocket.send_json({"type": "error", "payload": {"message": "Insufficient balance."}})
                    return
                
                if payload["orderType"] == "sell" and player_data["shares"] < quantity:
                    await websocket.send_json({"type": "error", "payload": {"message": "Insufficient shares."}})
                    return

                game.orders.append({
                    "id": f"order-{int(time.time() * 1000)}-{payload['playerId']}",
                    "playerId": payload["playerId"],
                    "type": payload["orderType"],
                    "price": price,
                    "quantity": quantity,
                    "round": game.current_round,
                })
                await broadcast_game_state(game_id)
                await websocket.send_json({"type": "notification", "payload": {"message": "Order submitted successfully!"}})

            elif msg_type == "end_round":
                game = games.get(game_id)
                if not game:
                    await websocket.send_json({"type": "error", "payload": {"message": "Game not found."}})
                    return
                if game.game_status != "active":
                    await websocket.send_json({"type": "error", "payload": {"message": "Game is not active."}})
                    return
                
                # Cancel any pending round timer task
                if game.round_timer_task:
                    game.round_timer_task.cancel()
                    game.round_timer_task = None
                
                await process_round(game_id)
                await websocket.send_json({"type": "notification", "payload": {"message": f"Round {game.current_round - 1} ended manually."}})

            else:
                await websocket.send_json({"type": "error", "payload": {"message": "Unknown message type"}})

    except WebSocketDisconnect:
        print(f"Player {player_id} disconnected from game {game_id}")
        if player_id and player_id in player_connections:
            del player_connections[player_id]
        # Optionally, handle player leaving the game (e.g., remove their orders, mark them inactive)
    except Exception as e:
        print(f"Error in websocket for player {player_id} in game {game_id}: {e}")
        if player_id and player_id in player_connections:
            del player_connections[player_id]
