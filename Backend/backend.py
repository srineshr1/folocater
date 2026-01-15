from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import ollama

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.post("/chat/stream")
def chat_stream(req: ChatRequest):
    def generate():
        for chunk in ollama.generate(
            model="deepseek-r1:8b",
            prompt=req.message,
            stream=True
        ):
            if "response" in chunk:
                yield chunk["response"]

    return StreamingResponse(generate(), media_type="text/plain")
