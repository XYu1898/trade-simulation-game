# Trading Simulation Game

This is a real-time multiplayer stock trading simulation game built with Next.js (React) for the frontend and FastAPI (Python) for the backend, communicating via WebSockets.

## Features

-   **Multiplayer:** Players can join a shared game instance.
-   **Real-time Updates:** Game state, prices, orders, and trades are updated in real-time via WebSockets.
-   **Two Stocks:** Trade Cambridge Mining (CAMB) and Oxford Water (OXFD) shares.
-   **Order Book:** View live buy and sell orders.
-   **Price Chart:** Visualize historical price movements.
-   **Player Portfolios:** Track cash, shares, total value, and profit/loss.
-   **Monitor Mode:** A special role to control game flow (start rounds, process orders).
-   **Market Makers:** AI-driven entities providing liquidity.

## Technologies Used

-   **Frontend:**
    -   Next.js (React)
    -   TypeScript
    -   Tailwind CSS
    -   shadcn/ui
    -   Recharts (for charts)
-   **Backend:**
    -   FastAPI (Python)
    -   WebSockets (websockets library)
    -   Uvicorn (ASGI server)
-   **Deployment:**
    -   Frontend: Vercel
    -   Backend: Fly.io (or any other platform supporting Python/FastAPI)

## Getting Started

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/your-repo/trading-simulation-game.git
cd trading-simulation-game
\`\`\`

### 2. Backend Setup (Python/FastAPI)

The backend is located in the `backend/` directory.

\`\`\`bash
cd backend
\`\`\`

**Create a Python Virtual Environment:**

\`\`\`bash
python3 -m venv venv
source venv/bin/activate # On Windows: .\venv\Scripts\activate
\`\`\`

**Install Dependencies:**

\`\`\`bash
pip install -r requirements.txt
\`\`\`

**Run the Backend Server:**

\`\`\`bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
\`\`\`

The backend will run on `http://localhost:8000`. The WebSocket endpoint will be `ws://localhost:8000/ws/trading-game-main`.

### 3. Frontend Setup (Next.js)

The frontend is located in the root directory.

\`\`\`bash
# Go back to the root directory if you are in 'backend'
cd ..
\`\`\`

**Install Dependencies:**

\`\`\`bash
npm install # or yarn install or pnpm install
\`\`\`

**Environment Variables:**

Create a `.env.local` file in the root directory and add your backend WebSocket URL:

\`\`\`
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/trading-game-main
\`\`\`

If you deploy your backend, update this URL to your deployed WebSocket endpoint (e.g., `wss://your-backend-app.fly.dev/ws/trading-game-main`).

**Run the Frontend Development Server:**

\`\`\`bash
npm run dev
\`\`\`

Open `http://localhost:3000` in your browser to see the application.

### 4. Deployment

#### Deploying the Frontend to Vercel

1.  **Create a new Vercel Project:** Go to [Vercel Dashboard](https://vercel.com/new) and import your Git repository.
2.  **Configure Environment Variable:** In your Vercel project settings, add the `NEXT_PUBLIC_WS_URL` environment variable, pointing to your deployed backend WebSocket URL.

#### Deploying the Backend to Fly.io

1.  **Install Fly.io CLI:** Follow the instructions on [Fly.io Docs](https://fly.io/docs/getting-started/installing-flyctl/).
2.  **Login to Fly.io:**
    \`\`\`bash
    flyctl auth login
    \`\`\`
3.  **Deploy:** From the `backend/` directory, run the deploy script:
    \`\`\`bash
    ./deploy.sh
    \`\`\`
    This script will build and deploy your FastAPI application. Note the URL of your deployed app.

## Game Flow

1.  **Lobby:** Players join the game by entering their name. A monitor player can start the game.
2.  **Setup:** Rules and initial price history are displayed. The monitor starts the first trading round.
3.  **Trading:** Players can submit buy/sell orders for CAMB and OXFD. Each player can submit up to 2 orders per round. Monitor can force close orders or process the round.
4.  **Processing:** Orders are matched, trades are executed, and new prices are calculated.
5.  **Results:** Round results, recent trades, and updated scoreboard are displayed. Monitor can advance to the next round.
6.  **Finished:** After 10 rounds, the final scoreboard and price history are shown. Players can start a new game.

## Contributing

Feel free to open issues or pull requests if you have suggestions or find bugs!
\`\`\`

```plaintext file="backend/Dockerfile"
# Use a lightweight Python image
FROM python:3.10-slim-buster

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY backend/ .

# Expose the port FastAPI will run on
EXPOSE 8000

# Command to run the FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
