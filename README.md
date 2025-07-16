# Trading Simulation Game

This is a real-time trading simulation game built with Next.js, React, and a Python FastAPI backend using WebSockets.

## Features

-   **Real-time Trading:** Players can buy and sell shares of a simulated asset.
-   **Order Book:** Displays live buy and sell orders.
-   **Price Chart:** Visualizes historical price movements.
-   **Player Portfolios:** Tracks each player's balance and shares.
-   **Game Rounds:** The game progresses in rounds, with prices and trades settling at the end of each round.
-   **Market Maker:** An automated market maker provides liquidity by placing bid and ask orders.

## Technologies Used

-   **Frontend:**
    -   Next.js (React Framework)
    -   TypeScript
    -   Tailwind CSS
    -   shadcn/ui (for UI components)
    -   Recharts (for charting)
    -   `ws` (WebSocket client)
-   **Backend:**
    -   Python 3.9+
    -   FastAPI (for API and WebSocket handling)
    -   `uvicorn` (ASGI server)
    -   `websockets` (Python WebSocket library)

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm (v8 or higher)
-   Python (v3.9 or higher)
-   pip (Python package installer)

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd trading-simulation-game
\`\`\`

### 2. Backend Setup

Navigate to the `backend` directory:

\`\`\`bash
cd backend
\`\`\`

Create a virtual environment and activate it:

\`\`\`bash
python -m venv venv
# On Windows
.\venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
\`\`\`

Install the Python dependencies:

\`\`\`bash
pip install -r requirements.txt
\`\`\`

Run the FastAPI backend server:

\`\`\`bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
\`\`\`

The backend server will run on `http://localhost:8000`.

### 3. Frontend Setup

Open a new terminal and navigate back to the root of the project:

\`\`\`bash
cd ..
\`\`\`

Install the Node.js dependencies:

\`\`\`bash
npm install
\`\`\`

Set up environment variables. Create a `.env.local` file in the root directory and add the WebSocket URL for your backend:

\`\`\`
NEXT_PUBLIC_WS_URL=localhost:8000
\`\`\`

Run the Next.js development server:

\`\`\`bash
npm run dev
\`\`\`

The frontend application will be available at `http://localhost:3000`.

## Deployment

### Deploying to Vercel (Frontend)

This project is designed to be easily deployed to Vercel.

1.  **Create a new Vercel Project:** Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click "Add New... Project".
2.  **Import Your Git Repository:** Connect your Git repository (GitHub, GitLab, Bitbucket).
3.  **Configure Project:**
    -   **Framework Preset:** Next.js
    -   **Root Directory:** (Leave empty if your project root is the repository root)
    -   **Environment Variables:** Add `NEXT_PUBLIC_WS_URL` pointing to your deployed backend WebSocket URL (e.g., `your-backend-app.fly.dev`).
4.  **Deploy:** Click "Deploy".

### Deploying Backend to Fly.io (or similar)

The `backend` directory contains a `Dockerfile` and `fly.toml` for easy deployment to Fly.io.

1.  **Install Fly.io CLI:** Follow the instructions on the [Fly.io documentation](https://fly.io/docs/getting-started/installing-flyctl/).
2.  **Login to Fly.io:**
    \`\`\`bash
    flyctl auth login
    \`\`\`
3.  **Navigate to Backend Directory:**
    \`\`\`bash
    cd backend
    \`\`\`
4.  **Launch the App:**
    \`\`\`bash
    flyctl launch
    \`\`\`
    Follow the prompts. This will create a `fly.toml` file (if not already present) and suggest a region.
5.  **Deploy:**
    \`\`\`bash
    flyctl deploy
    \`\`\`
    This will build and deploy your FastAPI application. Note the URL of your deployed app.

    **Important:** After deploying your backend, update the `NEXT_PUBLIC_WS_URL` environment variable in your Vercel project settings to point to your Fly.io app's WebSocket URL (e.g., `wss://your-app-name.fly.dev/ws`).

## Project Structure

\`\`\`
.
├── app/
│   └── page.tsx           # Main page for the Next.js app
├── backend/
│   ├── main.py            # FastAPI backend logic
│   ├── Dockerfile         # Dockerfile for backend deployment
│   ├── requirements.txt   # Python dependencies
│   └── fly.toml           # Fly.io configuration
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── order-book-display.tsx # Component to display order book
│   └── trading-game.tsx   # Main trading game component
├── hooks/
│   └── useGameState.ts    # Custom hook for managing game state
├── lib/
│   └── websocket.ts       # WebSocket client logic
├── public/                # Static assets
├── styles/
│   └── globals.css        # Global CSS styles (Tailwind)
├── next.config.mjs        # Next.js configuration
├── package.json           # Frontend dependencies
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
