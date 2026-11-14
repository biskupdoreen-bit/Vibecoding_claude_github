import uuid
from collections import defaultdict
from time import time

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import bot

app = FastAPI(title="Mieter-Chatbot")

_hits: dict[str, list[float]] = defaultdict(list)


class ChatIn(BaseModel):
    session_id: str | None = Field(default=None, max_length=64)
    message: str = Field(min_length=1, max_length=2000)


@app.post("/api/chat")
def chat(body: ChatIn):
    sid = body.session_id or uuid.uuid4().hex
    now = time()
    _hits[sid] = [t for t in _hits[sid] if now - t < 60]
    if len(_hits[sid]) >= 10:
        raise HTTPException(429, "Zu viele Nachrichten, bitte kurz warten.")
    _hits[sid].append(now)
    try:
        result = bot.chat(sid, body.message)
    except Exception:
        raise HTTPException(502, "Der Assistent ist gerade nicht erreichbar.")
    return {"session_id": sid, **result}


app.mount("/", StaticFiles(directory="static", html=True), name="static")
