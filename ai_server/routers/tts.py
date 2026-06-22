"""TTS 라우터. (ai_server_spec §5) — Typecast, JSON 응답(audio base64 + 타이밍)."""
import base64

from fastapi import APIRouter

from schemas.tts import SubtitleTiming, TtsRequest, TtsResponse
from services import typecast_service

router = APIRouter(prefix="/tts", tags=["tts"])


@router.post("", response_model=TtsResponse)
async def generate(req: TtsRequest) -> TtsResponse:
    r = await typecast_service.generate_tts(req.subtitles)
    return TtsResponse(
        audio_base64=base64.b64encode(r["audio_bytes"]).decode(),
        audio_format=r["audio_format"],
        duration=r["duration"],
        subtitle_timings=[SubtitleTiming(**t) for t in r["subtitle_timings"]],
    )
