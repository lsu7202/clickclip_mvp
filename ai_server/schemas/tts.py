"""TTS 스키마. (ai_server_spec §5) — Typecast 타임스탬프 기반."""
from pydantic import BaseModel

from schemas.scene import Subtitle


class TtsRequest(BaseModel):
    subtitles: list[Subtitle]  # 장면 자막들 (합쳐서 합성, 조각별 타이밍 산출)


class SubtitleTiming(BaseModel):
    subtitle_number: int
    start: int  # 장면 음성 내 상대 시작, µs
    end: int    # µs


class TtsResponse(BaseModel):
    audio_base64: str          # mp3 base64
    audio_format: str          # "mp3"
    duration: int              # 전체 길이, µs
    subtitle_timings: list[SubtitleTiming]
