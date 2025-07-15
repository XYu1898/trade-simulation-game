from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

players = []

@app.get("/state")
def get_state():
    return {"players": players}

@app.post("/join")
def join(name: str):
    players.append({"name": name})
    return {"ok": True}