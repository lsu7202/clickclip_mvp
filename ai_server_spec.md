# AI 서버 명세서 (ai_server_spec.md)

FastAPI(Python) 기반 모델 래퍼 서버. 백엔드(Node)만 호출하며, 외부 모델(Gemini / ElevenLabs / fal.ai)을 감싼다.

- 상위: [md.md](md.md) · 흐름: [flow_spec.md](flow_spec.md)
- **stateless** (DB·세션 없음). 모든 입출력 JSON = `snake_case` (Python 내부 = wire, 변환 0).
- MVP: 동기 처리, 에러 핸들링 최소.

---

## 0. 책임 범위

| 엔드포인트 | 모델 | 역할 |
|-----------|------|------|
| `POST /scenes/split` | Gemini | 대본 → 장면 분할 |
| `POST /scenes/keywords` | Gemini | 자막 → 검색 키워드 재추출 |
| `POST /scenes/image-prompts` | Gemini | 장면 → AI 이미지 프롬프트 5개 |
| `POST /images/generate` | fal.ai (나노바나나) | 프롬프트 → 이미지 |
| `POST /videos/generate` | fal.ai (Wan 2.5) | 프롬프트 → 동영상 |
| `POST /tts` | Typecast | 장면 자막 → mp3 + 자막 타이밍 |

> 백엔드의 `/scenes:split` 등은 동명의 AI 엔드포인트로 1:1 프록시된다(키워드 q 전달, 파일 저장은 백엔드 몫).

---

## 1. `POST /scenes/split` — 대본 장면 분할

대본을 장면 단위로 나눈다. **SDK `google-genai`**, 모델 `gemini-2.5-flash`, **structured output**(`response_mime_type="application/json"` + `response_schema=<Pydantic>`)로 구조 강제. (SDK/호출 상세: [external_api_spec.md](external_api_spec.md) §3)

### 요청
```json
{ "script_text": "전체 대본 원문..." }
```

### 응답
```json
{
  "scenes": [
    {
      "scene_number": 1,
      "subtitles": [
        { "subtitle_number": 1, "text": "너네 아직도" },
        { "subtitle_number": 2, "text": "아무 땅콩버터나 먹는거야?" }
      ],
      "search_keywords": ["peanut butter", "eating"],
      "scene_description": "땅콩버터를 일상적으로 먹는 상황 도입"
    }
  ]
}
```

### 필드 규칙
| 필드 | 타입 | 설명 |
|------|------|------|
| `scene_number` | int | 1부터 연속 |
| `subtitles[].subtitle_number` | int | 장면 내 1부터 연속 |
| `subtitles[].text` | string | 자막 한 줄(읽기 단위) |
| `search_keywords` | string[] | gif·이미지 **공용** 검색 키워드 (2~4개 권장, 영문) |
| `scene_description` | string | 장면 요약 (프롬프트 추천 입력으로 재사용) |

### response_schema (Gemini / Pydantic)
```python
class Subtitle(BaseModel):
    subtitle_number: int
    text: str

class Scene(BaseModel):
    scene_number: int
    subtitles: list[Subtitle]
    search_keywords: list[str]
    scene_description: str

class ScenesResponse(BaseModel):
    scenes: list[Scene]
# → response_schema=ScenesResponse (중첩 배열 지원 확인됨)
```

### 프롬프트 가이드 (templates/split_script.py)
- 역할: "주어진 대본을 짧은 영상용 장면으로 나눈다."
- 한 장면 = 의미 단위 1개. 장면의 자막들을 이어붙이면 자연스러운 한 문장/문단이 되도록.
- `search_keywords`는 **영문**, 검색 친화적(고유명사·시각 키워드 우선).
- 출력은 schema JSON만.

---

## 2. `POST /scenes/keywords` — 검색 키워드 재추출

자막 수정 후 [새로고침] 시 호출. 현재 자막 기준으로 키워드 새로 뽑음.

### 요청
```json
{ "subtitles": [ { "subtitle_number": 1, "text": "..." } ] }
```
> 또는 단순화: `{ "text": "장면 자막 합친 문장" }` 도 허용 (백엔드가 합쳐 보냄 가능).

### 응답
```json
{ "search_keywords": ["peanut butter", "trump"] }
```

- 키워드 성격은 §1의 `search_keywords`와 동일(영문, 2~4개).

---

## 3. `POST /scenes/image-prompts` — AI 이미지 프롬프트 5개

장면 내용 기반으로 이미지 생성 프롬프트 후보 5개 추천.

### 요청
```json
{
  "subtitles": [ { "subtitle_number": 1, "text": "..." } ],
  "scene_description": "땅콩버터를 일상적으로 먹는 상황 도입"
}
```

### 응답
```json
{
  "prompts": [
    "맛없는 땅콩버터",
    "트럼프가 땅콩버터를 들고있는",
    "페페가 땅콩버터를 들고있는",
    "...",
    "..."
  ]
}
```
- 정확히 **5개**. 짧은 한국어/영어 묘사문 (검색 키워드 아님 — 생성 프롬프트).

---

## 4. `POST /images/generate` — AI 이미지 생성 (fal.ai 나노바나나)

모델 ID `fal-ai/nano-banana`. Python `fal_client.subscribe_async(...)`. 상세: [external_api_spec.md](external_api_spec.md) §5.

### 요청
```json
{ "prompt": "트럼프가 땅콩버터를 들고있는" }
```
→ AI 서버가 fal에 보내는 arguments: `{ prompt, num_images:1, aspect_ratio:"9:16", output_format:"png" }`

### 응답
```json
{
  "image_url": "https://fal.../result.png",
  "width": 1080,
  "height": 1920
}
```
- fal 응답의 `images[0].url` → `image_url`로 반환. AI 서버는 **URL/바이트 + width/height만 반환**, 파일 저장은 백엔드가 수행(`asset_id`/`local_path` 부여).
- ⚠️ **나노바나나는 픽셀 크기 입력 불가** — `aspect_ratio:"9:16"`만 지정. 정확한 1080×1920이 필요하면 백엔드 저장 시 리사이즈(export 캔버스 일치용).
- 모델 ID·파라미터는 `config.py`에 고정.

---

## 4b. `POST /videos/generate` — AI 동영상 생성 (fal Wan 2.5)

모델 `fal-ai/wan-25-preview/text-to-video`. 상세: [external_api_spec.md](external_api_spec.md) §5-2.

### 요청 / 응답
```json
// req
{ "prompt": "..." }
// res
{ "video_url": "https://fal.../result.mp4" }
```
→ arguments: `{ prompt, aspect_ratio:"9:16", resolution:"720p", duration:"5" }`. 느려서 `subscribe_async`. 백엔드가 다운로드·저장(ffprobe로 w/h/길이).

---

## 5. `POST /tts` — TTS 생성 (Typecast, 자막 타이밍)

장면 단위. 자막들을 합쳐 합성하고, **단어 타임스탬프를 자막 조각에 매핑**해 자막별 타이밍 산출. (무음 텀 제거 없음 — 타임스탬프와 정합 유지)

### 요청
```json
{ "subtitles": [ { "subtitle_number": 1, "text": "너네 아직도" }, { "subtitle_number": 2, "text": "아무 땅콩버터나 먹는거야?" } ] }
```

### 응답
```json
{
  "audio_base64": "<mp3 base64>",
  "audio_format": "mp3",
  "duration": 5930000,
  "subtitle_timings": [
    { "subtitle_number": 1, "start": 0, "end": 1200000 },
    { "subtitle_number": 2, "start": 1200000, "end": 5930000 }
  ]
}
```
- Typecast `/v1/text-to-speech/with-timestamps`(`granularity=word`) 호출 → `audio_duration`·`words[]` 획득.
- `words[]` → 자막별 매핑(단어 수 기준 분배, µs). `duration`/`timings` 모두 **µs**.
- 속도 = `output.audio_tempo`(env `TTS_SPEED`). 호출 상세: [external_api_spec.md](external_api_spec.md) §4.
- 파일 저장은 백엔드 몫(AI 서버는 base64 + 타이밍 반환).

---

## 6. 공통

### 환경변수
| 변수 | 용도 |
|------|------|
| `GEMINI_API_KEY` | Gemini |
| `TYPECAST_API_KEY` / `TYPECAST_VOICE_ID` / `TYPECAST_MODEL` | TTS |
| `TTS_SPEED` | TTS 속도(audio_tempo, 0.5~2.0) |
| `FAL_KEY` | fal.ai (이미지·동영상) |
| `FAL_VIDEO_MODEL` / `FAL_VIDEO_RESOLUTION` / `FAL_VIDEO_DURATION` | Wan 2.5 |

### 단위/표기
- 모든 시간 = **µs**. 키 표기 = `snake_case`.
- 모델명·버전·파라미터·프롬프트 템플릿은 코드 상수로 고정(명세서에 박제).

### 폴더 (상세: [structure_spec.md](structure_spec.md))
```
ai_server/
  main.py
  routers/ { scenes.py, images.py, videos.py, tts.py }
  services/ { gemini_service.py, fal_service.py, typecast_service.py }
  schemas/ { scene.py, image.py, video.py, tts.py }   # pydantic = JSON 명세
  prompts/ { split_script.py, keywords.py, image_prompts.py }
  config.py
```
