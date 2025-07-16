# Trading Simulation Game

This is a multiplayer stock trading simulation game built with Next.js, React, and a Python FastAPI backend using WebSockets.

## Features

- **Multiplayer:** Players can join a game instance.
- **Player Roles:** Players can join as a regular trader or a monitor.
- **Game Phases:**
    - **Lobby:** Players join and the monitor starts the game.
    - **Setup:** Players view game rules and historical price data. Monitor initiates the first trading round.
    - **Trading:** Players submit buy/sell orders for Cambridge Mining (CAMB) stock.
    - **Processing:** Orders are matched, trades are executed, and new prices are calculated.
    - **Results:** Players view round results, including updated portfolios, recent trades, and the order book.
    - **Finished:** Final scoreboard and game statistics are displayed.
- **Market Makers:** AI-driven market makers provide liquidity by placing bid and ask orders.
- **Real-time Updates:** WebSocket communication ensures all players see real-time game state changes.
- **Scoreboard:** Live and final scoreboards track player performance.
- **Price Chart:** Visualizes historical and current stock prices.

## Getting Started

### 1. Environment Variables

You need to set up the following environment variables:

- `NEXT_PUBLIC_WS_URL`: The URL of your WebSocket backend (e.g., `ws://localhost:8000/ws/trading-game-main` for local development, or your deployed backend URL).
- `NEXT_PUBLIC_VERCEL_URL`: The URL where your Next.js frontend is deployed (e.g., `http://localhost:3000` for local development, or your Vercel deployment URL).

### 2. Run the Backend (Python FastAPI)

Navigate to the `backend` directory and install dependencies:

\`\`\`bash
cd backend
pip install -r requirements.txt
\`\`\`

Run the FastAPI application:

\`\`\`bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
\`\`\`

The backend will be accessible at `http://localhost:8000`. The WebSocket endpoint will be `ws://localhost:8000/ws/{game_id}`.

### 3. Run the Frontend (Next.js)

Navigate to the root directory of the project and install dependencies:

\`\`\`bash
npm install # or yarn install
\`\`\`

Run the Next.js development server:

\`\`\`bash
npm run dev # or yarn dev
\`\`\`

The frontend will be accessible at `http://localhost:3000`.

## Deployment

### Deploying the Backend (e.g., to Fly.io)

1.  **Install Fly.io CLI:** Follow the instructions on the [Fly.io website](https://fly.io/docs/getting-started/installing-flyctl/).
2.  **Login to Fly.io:** `flyctl auth login`
3.  **Navigate to backend directory:** `cd backend`
4.  **Launch the app:** `flyctl launch` (follow prompts, choose a region, etc.)
5.  **Deploy:** `flyctl deploy`

Once deployed, update `NEXT_PUBLIC_WS_URL` in your Next.js project to point to your Fly.io app's WebSocket URL (e.g., `wss://your-app-name.fly.dev/ws/trading-game-main`).

### Deploying the Frontend (to Vercel)

1.  **Connect your Git repository** to Vercel.
2.  **Set up environment variables** in your Vercel project settings:
    - `NEXT_PUBLIC_WS_URL` (your deployed backend WebSocket URL)
    - `NEXT_PUBLIC_VERCEL_URL` (your Vercel deployment URL, e.g., `https://your-project-name.vercel.app`)
3.  **Deploy** your project.

## Project Structure

- `backend/`: Python FastAPI WebSocket server.
- `app/`: Next.js App Router pages.
- `components/`: Reusable React components (including shadcn/ui).
- `hooks/`: React hooks for game logic and WebSocket communication.
- `lib/`: Utility functions.
- `public/`: Static assets.
- `styles/`: Global CSS.
