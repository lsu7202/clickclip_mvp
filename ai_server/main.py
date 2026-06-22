"""ClickClip AI 서버 (FastAPI). 모델 래퍼 — Gemini / fal.ai / ElevenLabs.

상세: ai_server_spec.md
"""
from fastapi import FastAPI

from routers import images, scenes, tts, videos

app = FastAPI(title="ClickClip AI Server")

app.include_router(scenes.router)
app.include_router(images.router)
app.include_router(videos.router)
app.include_router(tts.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
