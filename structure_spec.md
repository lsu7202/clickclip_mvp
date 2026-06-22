# 프로젝트 구조 명세서 (structure_spec.md)

3개 컨테이너의 폴더/파일 구조. 위에서 확정된 설계(흐름·API·export)를 폴더로 환원.

- 상위: [md.md](md.md) · 흐름: [flow_spec.md](flow_spec.md)
- 네이밍: 백엔드 파일 `camelCase.역할.js` · AI 서버 `snake_case.py` · 프론트 컴포넌트 `PascalCase.tsx`.

---

## 0. 레포 구성 (모노레포 + Docker)

> **전 컨테이너 Docker 구동 필수.** 환경변수도 Docker(compose env_file/environment)로 관리한다.
> 로컬 직접 실행(uvicorn/node/vite)이 아니라 **컨테이너 기준**으로 설계한다.

```
clickclip/
  docker-compose.yml         # 3 서비스 오케스트레이션 + env 관리
  .env.example               # 공용/참고용 (실제 .env는 gitignore)
  frontend/    # React        + Dockerfile, .env.example
  backend/     # Node.js       + Dockerfile, .env.example
  ai_server/   # FastAPI(Py)   + Dockerfile, .env.example
  templates/
    0615/                      # CapCut 골든 템플릿 (export 빌더가 복제)
  docs/                        # 본 명세서들 (*.md)
```

### 0-1. Docker 구성

| 서비스 | 베이스 이미지 | 포트 | 비고 |
|--------|---------------|------|------|
| `ai_server` | `python:3.12-slim` | 8000 | **ffmpeg 설치 필요**(pydub 무음 제거) |
| `backend` | `node:20-slim` | 4000 | workspace 볼륨 + templates 마운트 |
| `frontend` | `node:20-slim` | 5173 | vite dev (MVP) |

- **컨테이너 간 통신**: compose 네트워크. 백엔드 → AI서버는 `http://ai_server:8000`.
- **브라우저 → 백엔드**: 호스트 포트 발행(`localhost:4000`). 프론트 `VITE_API_BASE_URL=http://localhost:4000/api`.
- **볼륨**:
  - `templates/0615` → 백엔드 컨테이너에 read-only 마운트 (`CAPCUT_TEMPLATE_DIR`).
  - 명명 볼륨 `workspace` → 백엔드 `WORKSPACE_DIR` (다운로드 에셋/TTS/export 산출물).
- **env 관리**: 각 서비스 `env_file: ./<svc>/.env`. 실제 키 값은 `.env`(gitignore), 형식은 `.env.example`로 공유.

---

## 1. frontend/ (React)

```
frontend/
  src/
    api/
      client.js          # ★ snake↔camel 변환 단 한 곳
      scenes.api.js
      search.api.js
      assets.api.js
      tts.api.js
      export.api.js
    store/
      appStore.js        # scenes(SSOT), selectedSceneNumber, assetPanel
    features/
      scriptInput/
        ScriptInputStep.tsx
        ScriptTextarea.tsx
        ContinueButton.tsx
      sceneEditor/
        SceneEditor.tsx
        PreviewPane.tsx
        SceneList.tsx
        SceneRow.tsx
        SubtitleLine.tsx
        TtsControls.tsx
      assetPanel/
        AssetPanel.tsx
        AssetTabs.tsx
        SearchBar.tsx
        AssetGrid.tsx
        AiImagePanel.tsx
    components/           # 공용 UI (Button, Modal 등)
    App.tsx
    main.tsx
  package.json
  Dockerfile             # node:20-slim, vite dev
  .env.example
```
상세: [frontend_spec.md](frontend_spec.md) · 레이아웃: [layout_spec.md](layout_spec.md)

---

## 2. backend/ (Node.js)

```
backend/
  src/
    routes/
      scenes.route.js     # /scenes:split, /scenes/keywords, /scenes/image-prompts
      search.route.js     # /search/gifs, /search/images
      assets.route.js     # /assets/download, /images/generate
      tts.route.js        # /tts
      export.route.js     # /export
    controllers/
      scene.controller.js
      search.controller.js
      asset.controller.js
      tts.controller.js
      export.controller.js
    services/
      scene.service.js
      search.service.js
      asset.service.js
      tts.service.js
      export.service.js   # 0615 템플릿 빌더
    clients/
      ai.client.js        # FastAPI
      giphy.client.js
      serpapi.client.js
    storage/
      fileStore.js        # assets/audios 저장·조회 (workspace)
    serializers/
      case.js             # camel↔snake (응답/요청 경계)
    config/
      index.js            # env 로드
    app.js
    server.js
  package.json
  Dockerfile             # node:20-slim
  .env.example
```
상세: [backend_spec.md](backend_spec.md)

워크스페이스(런타임 생성, 레포 밖 또는 gitignore):
```
workspace/assets/{images,gifs,audios}/
```

---

## 3. ai_server/ (FastAPI)

```
ai_server/
  main.py
  routers/
    scenes.py            # /scenes/split, /scenes/keywords, /scenes/image-prompts
    images.py            # /images/generate
    videos.py            # /videos/generate (fal Wan 2.5)
    tts.py               # /tts (Typecast with-timestamps)
  services/
    gemini_service.py
    fal_service.py       # 이미지(나노바나나) + 동영상(Wan)
    typecast_service.py  # TTS + 자막 타이밍 정렬
  schemas/
    scene.py             # pydantic = JSON 명세 (snake)
    image.py
    video.py
    tts.py
  prompts/
    split_script.py
    keywords.py
    image_prompts.py
  config.py              # 키, 모델명/버전, 텀제거 임계값
  requirements.txt
  Dockerfile             # python:3.12-slim + ffmpeg
  .env.example
```
상세: [ai_server_spec.md](ai_server_spec.md)

---

## 4. templates/0615/ (CapCut 골든 템플릿)

```
templates/0615/
  draft_meta_info.json   # 미디어 등록부 템플릿
  draft_info.json        # 타임라인 템플릿 (스캐폴드 묶음 복제 원본)
  (assets/ 는 export 시 생성)
```
- `export.service.js`가 이 폴더를 복제 → 가변부 교체. 규칙: [capcut_export_spec.md](capcut_export_spec.md)

---

## 5. 환경변수 (서버별)

| 서버 | 변수 | 출처 |
|------|------|------|
| backend | `PORT`, `GIPHY_API_KEY`, `SERPAPI_KEY`, `CAPCUT_DRAFT_ROOT`, `CAPCUT_FONT_PATH` | `.env` |
| backend | `AI_SERVER_URL`, `WORKSPACE_DIR`, `CAPCUT_TEMPLATE_DIR` | **compose `environment`** (컨테이너 경로) |
| ai_server | `GEMINI_API_KEY`, `FAL_KEY`, `TYPECAST_API_KEY`, `TYPECAST_VOICE_ID`, `TYPECAST_MODEL`, `TTS_SPEED`, `FAL_VIDEO_MODEL`, `FAL_VIDEO_RESOLUTION`, `FAL_VIDEO_DURATION` | `.env` |
| frontend | `VITE_API_BASE_URL` | `.env` |

- **env 관리 = Docker**: 비밀 키는 각 서비스 `.env`(gitignore) → compose `env_file`. 컨테이너 경로/네트워크 주소는 compose `environment`로 주입.
- 형식 공유용 `.env.example`은 커밋. 실제 값은 커밋 금지.

---

## 6. 실행 (Docker)
```
docker compose up --build
```
- 한 번에 3 컨테이너 기동. 컨테이너 내부 실행 커맨드:
  - ai_server: `uvicorn main:app --host 0.0.0.0 --port 8000`
  - backend:   `node src/server.js`
  - frontend:  `vite --host`
- 접속: 프론트 `http://localhost:5173`, 백엔드 API `http://localhost:4000/api`.
- 배포는 범위 외 (compose는 로컬/개발 기준).
