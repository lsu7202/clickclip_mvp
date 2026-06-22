# 백엔드 명세서 (backend_spec.md)

Node.js 백엔드의 구조·동작·변환 규칙. 오케스트레이션 + 파일 저장 + CapCut export 담당.

- 상위: [md.md](md.md) · 계약: [api_contract_spec.md](api_contract_spec.md) · 흐름: [flow_spec.md](flow_spec.md)
- **stateless** (DB 없음). 영속 데이터 = 파일시스템(다운로드 에셋, TTS mp3, export 산출물).
- 내부 코드 = `camelCase`, 응답 JSON = `snake_case` (직렬화 레이어에서 변환).

---

## 1. 레이어 구조

```
요청 → routes → controllers → services → (clients | storage)
                                   ↑
                          serializers (camel→snake, 응답 직전)
```

| 레이어 | 책임 | 네이밍 |
|--------|------|--------|
| routes | 경로 정의(콜론 액션/kebab) → controller 연결 | `scenes.route.js` |
| controllers | 요청 검증 → service 호출 → 응답 | camelCase |
| services | 비즈니스 로직 | camelCase |
| clients | 외부/AI 호출 래퍼 | camelCase |
| storage | 파일 저장/조회 | camelCase |
| serializers | camel→snake 변환 (한 곳) | — |

---

## 2. 엔드포인트 ↔ 처리

| 엔드포인트 | service | 다운스트림 | 부수효과 |
|-----------|---------|-----------|----------|
| `POST /scenes:split` | sceneService.split | aiClient | 없음 |
| `POST /scenes/keywords` | sceneService.keywords | aiClient | 없음 |
| `GET /search/gifs` | searchService.gifs | giphyClient | 없음 |
| `GET /search/images` | searchService.images | serpapiClient | 없음 |
| `POST /scenes/image-prompts` | sceneService.imagePrompts | aiClient | 없음 |
| `POST /images/generate` | assetService.generateImage | aiClient(fal) | **파일 저장** |
| `POST /assets/download` | assetService.download | (http get) | **파일 저장** |
| `POST /tts` | ttsService.generate | aiClient | **파일 저장** |
| `POST /export` | exportService.build | (template/fs) | **zip 생성** |

---

## 3. 변환 규칙 (flip-flop 박멸)

- 내부 객체는 전부 `camelCase`. **응답 직렬화 미들웨어 한 곳**에서 `snake_case`로 변환해 내보낸다.
- 요청 바디(snake)는 controller 진입 시 camel로 역변환(또는 검증 후 매핑).
- 개별 service/controller에서 키 이름을 손으로 바꾸지 않는다.

```js
// 응답 직렬화 (의사코드)
app.use(serializeResponse(toSnakeCaseDeep))  // 모든 응답 공통
```

---

## 4. 파일 저장 (storage)

DB가 없으므로 "영속 = 파일". 저장 위치는 작업용 워크스페이스 하나.

```
workspace/
  assets/
    images/  <asset_id>.png|jpg
    gifs/    <asset_id>.gif
    audios/  <tts_id>.mp3
```

- `asset_id`/`tts_id` = 서버에서 UUID 생성.
- 응답의 `local_path`는 이 워크스페이스 기준 상대경로.
- export 시 `local_path`로 파일을 찾아 드래프트 폴더 `assets/`로 복사.
- 정리(GC)는 MVP 범위 외(무한 누적 허용 또는 수동 정리).

---

## 5. clients (외부 호출 래퍼)

| client | 대상 | 키(env) | 비고 |
|--------|------|---------|------|
| aiClient | FastAPI AI 서버 | `AI_SERVER_URL` | split/keywords/image-prompts/generate/tts |
| giphyClient | Giphy | `GIPHY_API_KEY` | search |
| serpapiClient | SerpAPI | `SERPAPI_KEY` | google_images |

- 외부 응답 → `api_contract_spec.md`의 통일 형태(`results[]`)로 매핑하는 책임은 client/service에 있음.
- 상세 파라미터·매핑: [external_api_spec.md](external_api_spec.md).

---

## 6. export 처리 개요

`POST /export` → `exportService.build(state)`:
1. `0615` 템플릿 폴더 복제
2. state의 각 asset/tts `local_path` → 드래프트 `assets/`로 복사
3. `draft_meta_info.json` / `draft_info.json` 재생성 (UUID·타이밍·경로)
4. `subtitles.srt` 생성
5. 폴더 → zip → 스트림 응답

상세 규칙(머티리얼/세그먼트/타이밍/경로 재작성): [capcut_export_spec.md](capcut_export_spec.md).

---

## 7. 환경변수
| 변수 | 용도 |
|------|------|
| `PORT` | 서버 포트 |
| `AI_SERVER_URL` | FastAPI 주소 |
| `GIPHY_API_KEY` | Giphy |
| `SERPAPI_KEY` | SerpAPI |
| `WORKSPACE_DIR` | 파일 저장 루트 |
| `CAPCUT_TEMPLATE_DIR` | `0615` 템플릿 경로 |
| `CAPCUT_DRAFT_ROOT` | export 경로 재작성용 CapCut 표준 루트 |

---

## 8. 폴더 구조 (상세: [structure_spec.md](structure_spec.md))
```
backend/src/
  routes/        scenes.route.js, search.route.js, assets.route.js, tts.route.js, export.route.js
  controllers/
  services/      scene.service.js, search.service.js, asset.service.js, tts.service.js, export.service.js
  clients/       ai.client.js, giphy.client.js, serpapi.client.js
  storage/       fileStore.js
  serializers/   case.js
  config/
```

## 9. MVP 비범위
- 인증/세션, 요청 검증 상세, 파일 GC, 비동기 큐, 재시도 — 전부 추후.
