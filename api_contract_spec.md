# API 계약 명세서 (api_contract_spec.md)

프론트 ↔ 백엔드 간 9개 엔드포인트의 요청/응답을 정의한다. **단일 진실 공급원(SSOT)** — 프론트와 백엔드는 이 표기를 그대로 따른다.

- 상위: [md.md](md.md) · 흐름: [flow_spec.md](flow_spec.md) · AI 측: [ai_server_spec.md](ai_server_spec.md)
- 모든 JSON = `snake_case`. base path = `/api`. 시간 단위 = µs.
- MVP: 인증 없음, 에러 바디 최소(`{ "error": "<message>" }` + 적절 status).

---

## 공통 타입 (DTO)

```jsonc
// subtitle
{ "subtitle_number": 1, "text": "..." }

// asset (선택/생성/업로드된 에셋)
{
  "asset_id": "uuid",
  "source_type": "gif" | "image" | "ai" | "upload" | "video",
  "local_path": "assets/images/xxx.png",   // 서버 저장 경로(상대)
  "width": 1024,
  "height": 1024,
  "duration": 8000000   // video일 때만 (원본 길이 µs). 이미지류는 없음
}

// tts (Typecast — 자막별 타이밍 포함)
{
  "tts_id": "uuid",
  "local_path": "assets/audios/xxx.mp3",
  "duration": 5930000,                       // 전체 길이 µs
  "subtitle_timings": [                       // 장면 음성 내 상대 µs
    { "subtitle_number": 1, "start": 0, "end": 900000 }
  ]
}

// scene (프론트 SSOT 단위)
{
  "scene_number": 1,
  "subtitles": [ /* subtitle */ ],
  "search_keywords": ["..."],
  "scene_description": "...",
  "asset": { /* asset | null */ },
  "tts":   { /* tts | null */ }
}
```

---

## 1. `POST /api/scenes:split` — 대본 분할

**req**
```json
{ "script_text": "전체 대본..." }
```
**res 200**
```json
{ "scenes": [ { "scene_number": 1, "subtitles": [ { "subtitle_number": 1, "text": "..." } ], "search_keywords": ["..."], "scene_description": "..." } ] }
```
→ AI `/scenes/split` 프록시. 프론트는 이걸 받아 `asset:null, tts:null` 붙여 SSOT 구성.

---

## 2. `POST /api/scenes/keywords` — 키워드 재추출 (새로고침)

**req**
```json
{ "subtitles": [ { "subtitle_number": 1, "text": "..." } ] }
```
**res 200**
```json
{ "search_keywords": ["peanut butter", "trump"] }
```

---

## 3. `GET /api/search/gifs?q=<keyword>` — GIF 검색 (Giphy)

**res 200**
```json
{
  "results": [
    { "source_url": "https://media.giphy.com/.../giphy.gif", "thumbnail_url": "https://.../200.gif", "width": 220, "height": 176 }
  ]
}
```

---

## 4. `GET /api/search/images?q=<keyword>` — 이미지 검색 (SerpAPI)

**res 200**
```json
{
  "results": [
    { "source_url": "https://.../image.jpg", "thumbnail_url": "https://.../thumb.jpg", "width": 1200, "height": 800 }
  ]
}
```
> 3·4는 응답 형태 통일(`results[]` with `source_url`/`thumbnail_url`/`width`/`height`) — 프론트가 한 컴포넌트로 처리.

---

## 5. `POST /api/scenes/image-prompts` — AI 프롬프트 5개

**req**
```json
{ "subtitles": [ { "subtitle_number": 1, "text": "..." } ], "scene_description": "..." }
```
**res 200**
```json
{ "prompts": ["...", "...", "...", "...", "..."] }
```

---

## 6. `POST /api/images/generate` — AI 이미지 생성 (fal.ai)

**req**
```json
{ "prompt": "트럼프가 땅콩버터를 들고있는" }
```
**res 200** — 생성 후 서버 저장까지 끝난 asset 반환
```json
{ "asset_id": "uuid", "source_type": "ai", "local_path": "assets/images/uuid.png", "width": 1080, "height": 1920 }
```
> 나노바나나는 `aspect_ratio:"9:16"`로 생성(픽셀 크기 입력 불가) → 백엔드 저장 시 1080×1920으로 리사이즈. 상세: [external_api_spec.md](external_api_spec.md) §5.

### 6b. `POST /api/videos/generate` — AI 동영상 생성 (fal Wan 2.5)
**req** `{ "prompt": "..." }`
**res 200** — 생성·다운로드·저장 끝난 video asset
```json
{ "asset_id": "uuid", "source_type": "video", "local_path": "assets/videos/uuid.mp4", "width": 720, "height": 1280, "duration": 5000000 }
```
> 느림(수십초~분). 백엔드 타임아웃 300s. 동영상은 export 시 무음 처리.

---

## 7. `POST /api/assets/download` — 외부 에셋 다운로드/저장

gif·이미지 썸네일 선택 시. 원격 URL을 받아 서버에 저장.

**req**
```json
{ "source_url": "https://media.giphy.com/.../giphy.gif", "source_type": "gif" }
```
**res 200**
```json
{ "asset_id": "uuid", "source_type": "gif", "local_path": "assets/gifs/uuid.gif", "width": 220, "height": 176 }
```

### 7b. `POST /api/assets/upload` — 직접 업로드 (이미지/동영상)
- **multipart/form-data**, 필드명 `file`. mimetype으로 이미지/동영상 분기.
**res 200** — 이미지면 `source_type:"upload"`, 동영상이면 `source_type:"video"`(+`duration`)
```json
{ "asset_id": "uuid", "source_type": "video", "local_path": "assets/videos/uuid.mp4", "width": 1080, "height": 1920, "duration": 8000000 }
```

---

## 8. `POST /api/tts` — TTS 생성 (장면 단위, Typecast)

**req** — 장면 자막들 전송 (합쳐서 합성 + 자막별 타이밍 산출)
```json
{ "subtitles": [ { "subtitle_number": 1, "text": "너네 아직도" }, { "subtitle_number": 2, "text": "아무 땅콩버터나 먹는거야?" } ] }
```
**res 200**
```json
{
  "tts_id": "uuid", "local_path": "assets/audios/uuid.mp3", "duration": 5930000,
  "subtitle_timings": [
    { "subtitle_number": 1, "start": 0, "end": 1200000 },
    { "subtitle_number": 2, "start": 1200000, "end": 5930000 }
  ]
}
```
→ AI `/tts`(Typecast with-timestamps) 호출 → base64 디코드 mp3 저장 + 타이밍 전달. `subtitle_timings`는 export 자막 타이밍에 사용(없으면 글자수 비례 폴백).

---

## 9. `POST /api/export` — CapCut zip 생성/다운로드

프론트가 전체 작업 상태 전송. 응답은 zip 파일(스트림).

**req**
```json
{
  "canvas": { "width": 1080, "height": 1920 },
  "scenes": [
    {
      "scene_number": 1,
      "subtitles": [ { "subtitle_number": 1, "text": "..." } ],
      "asset": { "asset_id": "uuid", "source_type": "gif", "local_path": "assets/gifs/uuid.gif", "width": 220, "height": 176 },
      "tts":   { "tts_id": "uuid", "local_path": "assets/audios/uuid.mp3", "duration": 5930000 }
    }
  ]
}
```
**res 200** — `application/zip` (CapCut 드래프트 폴더 압축). 빌드 규칙: [capcut_export_spec.md](capcut_export_spec.md).

---

## 상태 코드 (MVP 최소)
| 코드 | 의미 |
|------|------|
| 200 | 성공 |
| 400 | 필수 필드 누락 |
| 500 | 다운스트림(모델/외부 API) 실패 |

에러 바디: `{ "error": "<사람이 읽을 메시지>" }`.
