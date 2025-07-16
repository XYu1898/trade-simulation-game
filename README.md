# Trading Simulation Game

This is a multiplayer stock trading simulation game built with Next.js (frontend) and FastAPI (backend).

## Features

-   **Multiplayer:** Supports multiple players and a monitor.
-   **Trading Rounds:** Players can submit buy/sell orders for a simulated stock (Cambridge Mining - CAMB) over multiple rounds.
-   **Order Book:** Live order book displays pending buy and sell orders.
-   **Price History Chart:** Visualizes the stock price movement throughout the game.
-   **Scoreboard:** Tracks player cash, shares, and total portfolio value.
-   **Monitor Controls:** A dedicated monitor interface to start/process rounds and manage the game.
-   **Market Makers:** AI-driven market makers provide liquidity to the market.

## Technologies Used

-   **Frontend:**
    -   Next.js 14 (React)
    -   TypeScript
    -   Tailwind CSS
    -   shadcn/ui (for UI components)
    -   Recharts (for charting)
    -   `ws` (for WebSocket communication)
-   **Backend:**
    -   FastAPI (Python web framework)
    -   `websockets` (for WebSocket communication)
    -   `uvicorn` (ASGI server)

## Getting Started

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/your-username/trading-simulation-game.git
cd trading-simulation-game
\`\`\`

### 2. Backend Setup (Python/FastAPI)

The backend is a FastAPI application that manages the game state and WebSocket connections.

\`\`\`bash
# Navigate to the backend directory
cd backend

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI application
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
\`\`\`

The backend server will run on `http://localhost:8000`.

### 3. Frontend Setup (Next.js)

The frontend is a Next.js application that provides the user interface for the game.

\`\`\`bash
# Navigate back to the root directory
cd ..

# Install dependencies
npm install # or yarn install or pnpm install

# Run the Next.js development server
npm run dev
\`\`\`

The frontend application will run on `http://localhost:3000`.

### 4. Play the Game

1.  Open your browser and go to `http://localhost:3000`.
2.  Enter your name and choose to "Join as Player" or "Join as Monitor".
3.  If you join as a Monitor, you can start the game from the lobby.
4.  Players can submit orders, view the order book, and track their portfolio.
5.  The Monitor controls the progression of rounds.

## Deployment

### Deploying the Backend (FastAPI)

You can deploy the FastAPI backend to platforms like Fly.io, Render, or a custom VPS. An example `Dockerfile` and `fly.toml` are provided for Fly.io deployment.

\`\`\`bash
# Example for Fly.io deployment
flyctl launch
flyctl deploy
\`\`\`

### Deploying the Frontend (Next.js)

The Next.js frontend can be easily deployed to Vercel.

1.  Create a new project on Vercel and link your Git repository.
2.  Vercel will automatically detect it as a Next.js project and deploy it.
3.  **Environment Variables:** If your backend is deployed to a custom URL, you'll need to set the `NEXT_PUBLIC_WS_URL` environment variable in your Vercel project settings to point to your deployed WebSocket backend (e.g., `wss://your-backend-app.fly.dev/ws`).

## Project Structure

\`\`\`
.
├── backend/                # FastAPI backend
│   ├── main.py             # Main FastAPI application and game logic
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Dockerfile for containerization
│   └── fly.toml            # Fly.io configuration
├── public/                 # Static assets
├── styles/                 # Global CSS
├── app/                    # Next.js App Router pages
│   └── page.tsx            # Main game page
├── components/             # React components (UI, game-specific)
│   ├── ui/                 # shadcn/ui components
│   ├── OrderBookDisplay.tsx # Component for displaying order book
│   └── trading-game.tsx    # Main game client component
├── hooks/                  # React hooks
│   └── useGameState.ts     # Custom hook for game state management
├── lib/                    # Utility functions
│   └── websocket.ts        # WebSocket URL helper
├── trading-simulation.tsx  # Wrapper component for TradingGame
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── README.md
