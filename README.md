# Trading Simulation Game

This is a multiplayer stock trading simulation game built with Next.js (React) for the frontend and a Python FastAPI WebSocket server for the backend.

## Features

-   **Multiplayer:** Players can join a shared game instance.
-   **Monitor Mode:** A designated monitor can control game phases (start game, process rounds, move to next round).
-   **Player Mode:** Players can submit buy/sell orders for a simulated stock.
-   **Market Makers:** AI-driven market makers provide liquidity.
-   **Order Book:** Real-time display of pending buy and sell orders.
-   **Price Chart:** Visualizes historical and current stock prices.
-   **Live Scoreboard:** Tracks player cash, shares, and total portfolio value.
-   **Game Phases:** Lobby, Setup, Trading, Processing, Results, Finished.
-   **Persistent Game State:** Game state is managed on the backend.

## Technologies Used

-   **Frontend:**
    -   Next.js (React)
    -   TypeScript
    -   Tailwind CSS
    -   shadcn/ui
    -   Recharts (for charts)
    -   `ws` (for WebSocket client)
-   **Backend:**
    -   Python
    -   FastAPI (for WebSocket server)
    -   `uvicorn` (ASGI server)
    -   `websockets` (for WebSocket server)

## Setup and Running Locally

### 1. Clone the repository

\`\`\`bash
git clone [repository-url]
cd trading-simulation-game
\`\`\`

### 2. Backend Setup (Python FastAPI)

Navigate to the `backend` directory:

\`\`\`bash
cd backend
\`\`\`

Create a virtual environment and activate it:

\`\`\`bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
\`\`\`

Install the required Python packages:

\`\`\`bash
pip install -r requirements.txt
\`\`\`

Run the FastAPI server:

\`\`\`bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
\`\`\`

The backend server will run on `http://localhost:8000`. The WebSocket endpoint will be `ws://localhost:8000/ws/trading-game-main`.

### 3. Frontend Setup (Next.js)

Open a new terminal and navigate back to the root directory of the project:

\`\`\`bash
cd ..
\`\`\`

Install Node.js dependencies:

\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

Set up environment variables. Create a `.env.local` file in the root directory and add:

\`\`\`
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_VERCEL_URL=http://localhost:3000
\`\`\`

Run the Next.js development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

The frontend will run on `http://localhost:3000`.

## How to Play

1.  Open `http://localhost:3000` in multiple browser tabs or windows.
2.  In one tab, enter a name and click "Join as Monitor".
3.  In other tabs, enter names and click "Join as Player".
4.  The monitor can then click "Start Game" (from Lobby) or "Start Trading Round 1" (from Setup) to begin the game.
5.  Players can submit buy/sell orders for "Cambridge Mining (CAMB)" stock.
6.  Once all non-monitor players have submitted their 2 orders or clicked "Done", the monitor can click "Process Round".
7.  After processing, the monitor can click "Start Round X" to proceed to the next round.
8.  The game concludes after 10 rounds, displaying a final scoreboard.

## Deployment

### Deploying the Backend (e.g., to Fly.io)

This project includes a `backend/Dockerfile` and `backend/fly.toml` for easy deployment to Fly.io.

1.  Install the Fly.io CLI: `curl -L https://fly.io/install.sh | sh`
2.  Log in: `flyctl auth login`
3.  Navigate to the `backend` directory: `cd backend`
4.  Launch the app (this will create a `fly.toml` if it doesn't exist and prompt for a region): `flyctl launch`
5.  Deploy: `flyctl deploy`

After deployment, update your `NEXT_PUBLIC_WS_URL` in your Next.js project's environment variables to point to your deployed backend's WebSocket URL (e.g., `wss://your-app-name.fly.dev/ws`).

### Deploying the Frontend (to Vercel)

1.  Push your Next.js project to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import your project into Vercel.
3.  Add the `NEXT_PUBLIC_WS_URL` and `NEXT_PUBLIC_VERCEL_URL` environment variables in your Vercel project settings.
    -   `NEXT_PUBLIC_WS_URL`: Should point to your deployed backend's WebSocket URL (e.g., `wss://your-backend-app.fly.dev/ws`).
    -   `NEXT_PUBLIC_VERCEL_URL`: Should be your Vercel deployment URL (e.g., `https://your-vercel-app.vercel.app`).
4.  Vercel will automatically deploy your Next.js application.
