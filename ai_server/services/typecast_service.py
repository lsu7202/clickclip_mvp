"""Typecast TTS 래퍼 — with-timestamps로 자막별 정확 타이밍 산출. (external_api_spec §4)

- 동기식. /v1/text-to-speech/with-timestamps → audio(base64) + audio_duration + words[].
- 장면 자막들을 합쳐 합성 → 단어 타임스탬프를 자막 조각에 매핑.
- 반환: { audio_bytes, audio_format, duration(µs), subtitle_timings:[{subtitle_number,start,end}] }
"""
import base64

import httpx

import config

_URL = "https://api.typecast.ai/v1/text-to-speech/with-timestamps"


async def _synthesize(text: str) -> dict:
    payload = {
        "voice_id": config.TYPECAST_VOICE_ID,
        "text": text,
        "model": config.TYPECAST_MODEL,
        "language": config.TYPECAST_LANGUAGE,
        "output": {
            "audio_format": config.TYPECAST_OUTPUT_FORMAT,
            "audio_tempo": config.TTS_SPEED,  # 속도(env)
        },
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            _URL,
            headers={"X-API-KEY": config.TYPECAST_API_KEY or "", "Content-Type": "application/json"},
            params={"granularity": "word"},
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
    return {
        "audio_bytes": base64.b64decode(data["audio"]),
        "audio_format": data.get("audio_format", "mp3"),
        "duration_sec": float(data["audio_duration"]),
        "words": data.get("words") or [],
    }


def _sec_to_us(sec: float) -> int:
    return round(sec * config.US_PER_SEC)


def _align(subtitles, words, duration_sec: float) -> list[dict]:
    """단어 타임스탬프를 자막 조각에 단어 수 기준으로 분배."""
    timings = []
    i = 0
    total = len(words)
    for sub in subtitles:
        n = max(1, len(sub.text.split()))
        if i >= total:
            # 단어 소진 → 끝에 0길이로 배치(폴백)
            timings.append({"subtitle_number": sub.subtitle_number,
                            "start": _sec_to_us(duration_sec),
                            "end": _sec_to_us(duration_sec)})
            continue
        j = min(i + n, total) - 1
        start = _sec_to_us(float(words[i]["start"]))
        end = _sec_to_us(float(words[j]["end"]))
        timings.append({"subtitle_number": sub.subtitle_number, "start": start, "end": end})
        i = j + 1
    return timings


async def generate_tts(subtitles) -> dict:
    text = " ".join(s.text for s in subtitles).strip()
    res = await _synthesize(text)
    timings = _align(subtitles, res["words"], res["duration_sec"])
    return {
        "audio_bytes": res["audio_bytes"],
        "audio_format": res["audio_format"],
        "duration": _sec_to_us(res["duration_sec"]),
        "subtitle_timings": timings,
    }
