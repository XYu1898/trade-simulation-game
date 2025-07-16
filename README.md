# Trading Simulation Game

A multiplayer stock trading simulation game with real-time WebSocket communication.

## Features

- **Multiplayer Support**: Multiple players can join and trade simultaneously
- **Monitor Role**: A monitor can control game flow and process rounds
- **Real-time Updates**: All players see live updates of orders, trades, and prices
- **Order Book**: View buy/sell orders for both stocks
- **Market Makers**: AI players provide liquidity
- **Live Scoreboard**: Real-time rankings and portfolio values
- **Price Charts**: Historical price data with trade markers

## Architecture

- **Frontend**: Next.js with React, TypeScript, and shadcn/ui
- **Backend**: Python FastAPI with WebSocket support
- **Deployment**: Frontend on Vercel, Backend on Fly.io

## Setup Instructions

### Backend Deployment (Fly.io)

1. Install Fly.io CLI:
   \`\`\`bash
   curl -L https://fly.io/install.sh | sh
   \`\`\`

2. Login to Fly.io:
   \`\`\`bash
   fly auth login
   \`\`\`

3. Navigate to backend folder and deploy:
   \`\`\`bash
   cd backend
   chmod +x deploy.sh
   ./deploy.sh
   \`\`\`

4. Your backend will be available at: `https://trade-simulation-game.fly.dev`

### Frontend Deployment (Vercel)

1. Push your code to GitHub

2. Connect your GitHub repo to Vercel

3. Deploy - the frontend will automatically connect to your Fly.io backend

## Game Rules

1. **Two Stocks**: Cambridge Mining (CAMB) and Oxford Water (OXFD)
2. **10 Rounds**: Each round allows up to 5 orders per player
3. **Starting Capital**: $10,000 per player
4. **Order Matching**: Orders execute when bid price ≥ ask price
5. **Market Makers**: 5 AI players provide liquidity
6. **Scoring**: Final ranking based on total portfolio value

## How to Play

1. **Join Game**: Enter your name and join as Player or Monitor
2. **Wait for Players**: Monitor starts the game when ready
3. **View Setup**: See game rules and historical price data
4. **Trade**: Submit buy/sell orders each round
5. **Monitor Processing**: Monitor processes each round when players are done
6. **Live Updates**: See real-time price updates and portfolio changes
7. **Final Scoreboard**: View final rankings after 10 rounds

## Development

### Local Backend
\`\`\`bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
\`\`\`

### Local Frontend
\`\`\`bash
npm install
npm run dev
\`\`\`

## Environment Variables

No environment variables needed - the frontend automatically connects to your Fly.io backend at `https://trade-simulation-game.fly.dev`.

## Support

For issues or questions, check the logs:
- Backend logs: `fly logs -a trade-simulation-game`
- Frontend logs: Check Vercel dashboard
