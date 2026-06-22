# 외부 API 연동 명세서 (external_api_spec.md)

백엔드/AI 서버가 호출하는 외부 API의 연동 상세. **공식 문서 검증 완료(2026-06)** — 필드명/파라미터는 실제 스키마 기준.

- 상위: [md.md](md.md) · 계약: [api_contract_spec.md](api_contract_spec.md)
- 응답은 우리 계약 형태로 **매핑**해서 프론트에 전달(우리 wire = snake_case).

| API | 호출 위치 | 용도 | 공식 문서 |
|-----|-----------|------|-----------|
| Giphy | 백엔드 | GIF 검색 | https://developers.giphy.com/docs/api/endpoint/#search |
| SerpAPI | 백엔드 | Google 이미지 검색 | https://serpapi.com/google-images-api |
| Gemini | AI 서버 | 분할·키워드·프롬프트 | https://ai.google.dev/gemini-api/docs/structured-output |
| ElevenLabs | AI 서버 | TTS | https://elevenlabs.io/docs/api-reference/text-to-speech/convert |
| fal.ai (나노바나나) | AI 서버 | 이미지 생성 | https://fal.ai/models/fal-ai/nano-banana/api |

---

## 1. Giphy (백엔드)

- `GET https://api.giphy.com/v1/gifs/search`
- 키: `GIPHY_API_KEY` (env). **Beta 키 = 100 calls/hour** (초과 시 production 키 신청).

**요청 파라미터**
| 파라미터 | 값 |
|----------|-----|
| `api_key` | 키 |
| `q` | 검색 키워드 (≤50자) |
| `limit` | 예: 20 (기본 25) |
| `offset` | 페이지(기본 0, offset+limit ≤ 5000) |
| `rating` | `g`/`pg`/`pg-13`/`r` |
| `lang` | ISO 639-1 (예: `en`) |

**응답 매핑** (Giphy → 우리 `results[]`)
```
data[].images.fixed_width.url      → thumbnail_url   (그리드용 ~200px)
data[].images.original.url         → source_url      (다운로드 대상)
data[].images.original.width       → width
data[].images.original.height      → height
```
> ⚠️ **width/height/size는 문자열**(`"480"`)로 옴 → 매핑 시 정수 파싱(`parseInt`) 필수.

---

## 2. SerpAPI — Google Images (백엔드)

- `GET https://serpapi.com/search.json`
- 키: `SERPAPI_KEY` (env, 공식 Python SDK 표준 이름). 쿼리 파라미터 `api_key`로 전달.

**요청 파라미터**
| 파라미터 | 값 |
|----------|-----|
| `engine` | `google_images` |
| `q` | 검색 키워드 |
| `api_key` | 키 |
| `ijn` | (선택) 페이지 0~99 |
| `imgar` | (선택) 종횡비 `t`(tall)/`w`/`s`/`xw` — 세로 영상엔 `t` 고려 |

**응답 매핑** (SerpAPI `images_results[]` → 우리 `results[]`)
```
images_results[].original          → source_url
images_results[].thumbnail         → thumbnail_url
images_results[].original_width    → width    (정수)
images_results[].original_height   → height   (정수)
```
> width/height는 **정수**(Giphy와 다름). 캐시된 검색은 쿼터 무료.

> Giphy·SerpAPI 모두 우리 통일 형태 `{ results: [ { source_url, thumbnail_url, width, height } ] }` 로 변환해 반환.

---

## 3. Gemini (AI 서버)

- 용도: `/scenes/split`, `/scenes/keywords`, `/scenes/image-prompts`
- **SDK: `google-genai`** (신규) — `pip install google-genai`, `from google import genai`. (구 `google-generativeai`는 사용 안 함)
- 키: env `GEMINI_API_KEY` (또는 `GOOGLE_API_KEY`). `genai.Client()`가 자동 인식. 클라이언트는 **앱 시작 시 1회 생성** 후 재사용.
- 모델: **`gemini-2.5-flash`** (기본). 더 강한 추론 필요 시 `gemini-2.5-pro`.
- **Structured output**: `response_mime_type="application/json"` + `response_schema=<Pydantic 클래스>`.

```python
from google import genai
from google.genai import types
from pydantic import BaseModel

client = genai.Client()  # GEMINI_API_KEY 자동 인식

resp = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=ScenesResponse,   # Pydantic, scenes[].subtitles[] 중첩 지원
    ),
)
data = ScenesResponse.model_validate_json(resp.text)
```
- 중첩 배열(`scenes[].subtitles[]`) 지원 확인됨. 2.5+ 모델은 스키마 필드 선언 순서대로 출력.
- JSON 형식은 보장되나 값의 의미적 정확성은 보장 안 됨 → 앱에서 재검증(Pydantic).

각 엔드포인트 입출력 JSON: [ai_server_spec.md](ai_server_spec.md).

---

## 4. Typecast (AI 서버) — TTS

- 엔드포인트: `POST https://api.typecast.ai/v1/text-to-speech/with-timestamps`
- 인증: 헤더 **`X-API-KEY`** / env `TYPECAST_API_KEY`.
- **동기식** (구 speak/poll 폐기). 응답 = JSON `{audio(base64), audio_duration(초), words[]{text,start,end}}`.

**요청 — 바디(JSON)**
| 필드 | 값 |
|------|-----|
| `voice_id` | env `TYPECAST_VOICE_ID` (`tc_`…) |
| `text` | 장면 자막들 합친 문장 |
| `model` | env `TYPECAST_MODEL` (`ssfm-v30`) |
| `language` | `"kor"` |
| `output.audio_format` | `"mp3"` |
| `output.audio_tempo` | **속도, env `TTS_SPEED`** (0.5~2.0, 기본 1.0) |
| (쿼리) `granularity` | `"word"` |

**타임라인 영향 (핵심):** `audio_duration`으로 장면 길이, `words[]`로 **자막별 정확 타이밍** 산출(글자수 추정 폐기). AI 서버가 단어→자막 매핑 후 `subtitle_timings`(µs) 반환. 무음 텀 제거(pydub) 불필요 → 삭제.

---

## 5. fal.ai (AI 서버) — 이미지 + 동영상

- 인증: env **`FAL_KEY`** (자동 인식). Python `fal_client.subscribe_async`.

### 5-1. 나노바나나 (이미지) — `/images/generate`
- 모델 `fal-ai/nano-banana`. `aspect_ratio:"9:16"`(픽셀 입력 불가), `output_format:"png"`.
- 응답 `images[0].url` (+ width/height, **null 가능 → 0 보정**). 백엔드가 1080×1920 리사이즈 저장.

### 5-2. Wan 2.5 (동영상) — `/videos/generate`
- 모델 **`fal-ai/wan-25-preview/text-to-video`** (env `FAL_VIDEO_MODEL`).
- arguments: `prompt`, `aspect_ratio:"9:16"`, `resolution`(env `FAL_VIDEO_RESOLUTION`=720p), `duration`(env `FAL_VIDEO_DURATION`="5"/"10", **문자열**).
- 응답 `result["video"]["url"]` → 백엔드가 다운로드·저장(ffprobe로 w/h/길이 추출).
- ⚠️ **느림**(수십초~분): sync 유지, 백엔드 axios 타임아웃 300s. 품질 업그레이드 시 `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`로 모델ID만 교체.

---

## 6. 키 보관 / 보안
- 모든 키는 **환경변수**로만. 코드/프론트 하드코딩 금지.
- 프론트는 외부 API를 직접 호출하지 않음(전부 백엔드 경유) → 키 노출 없음.
- 위치: Giphy(`GIPHY_API_KEY`)·SerpAPI(`SERPAPI_KEY`) = 백엔드 / Gemini(`GEMINI_API_KEY`)·Typecast(`TYPECAST_API_KEY`,`TYPECAST_VOICE_ID`,`TTS_SPEED`)·fal.ai(`FAL_KEY`,`FAL_VIDEO_*`) = AI 서버.

## 7. MVP 비범위
- 쿼터/레이트리밋 처리, 캐싱, 재시도/백오프 — 추후.
