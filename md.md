# ClickClip 명세서 마스터 플랜 (md.md)

> 모든 개발 과정을 **사전에 100% 계획**한 뒤 구현한다.
> 함수명 · 환경변수명 · API 경로 · JSON 키 등 모든 식별자를 코딩 전에 본 명세서 체계 안에서 확정한다.
> 본 문서는 **전체 명세서의 인덱스(목차) + 공통 네이밍 규칙 + 확정 아키텍처**를 정의하는 최상위 문서다.

---

## 0. 아키텍처 한눈에 (MVP)

```
[React]  ──(/api, snake_case JSON)──>  [Node 백엔드]  ──┬──> [FastAPI AI서버] ──> Gemini / fal.ai(이미지·동영상) / Typecast
 작업상태 SSOT 보유                      stateless 함수     ├──> Giphy
 (저장·DB 없음)                          + 파일저장 + export ├──> SerpAPI
                                                          └──> 파일시스템 (assets / tts / export zip)
```

- **DB 없음.** 작업 상태(장면/자막/선택 에셋·TTS 참조)는 **프론트(React)가 단일 진실원(SSOT)** 으로 보유.
- 백엔드는 **무상태(stateless)**: 생성·검색·다운로드·export 함수만 제공. 영속 데이터는 파일시스템(다운로드 에셋, TTS mp3, export 산출물)뿐.
- 프론트는 **백엔드하고만** 통신. AI서버·외부 API 키는 전부 백엔드 뒤에 은닉.
- MVP 가정: **에러 핸들링 최소 · 저장/프로젝트 관리 없음 · 모든 호출 동기(sync)**.
- **구동: 전 컨테이너 Docker (docker-compose).** 환경변수도 compose(env_file/environment)로 관리. 상세: [structure_spec.md](structure_spec.md) §0.

---

## 1. 명세서 목록 (Index)

### 1-1. 작성 완료
| 문서 | 파일명 | 내용 |
|------|--------|------|
| 기능 명세서 | [spec.md](spec.md) | 단계별 워크플로우 / 프론트 수행 기능 |
| 프론트 레이아웃 명세서 | [layout_spec.md](layout_spec.md) | 화면별 레이아웃 / 버튼 배치 |
| 마스터 플랜 | [md.md](md.md) | 본 문서 (인덱스 / 네이밍 / 아키텍처) |
| 워크플로우 명세서 | [flow_spec.md](flow_spec.md) | 전체 단계별 데이터 흐름 |
| AI 서버 명세서 | [ai_server_spec.md](ai_server_spec.md) | 5개 AI 엔드포인트 + JSON 구조 |
| API 계약 명세서 | [api_contract_spec.md](api_contract_spec.md) | 백엔드 9개 엔드포인트 요청/응답 |
| 백엔드 명세서 | [backend_spec.md](backend_spec.md) | 백엔드 구조/동작/직렬화 |
| 외부 API 명세서 | [external_api_spec.md](external_api_spec.md) | Giphy/SerpAPI/fal.ai/ElevenLabs |
| CapCut export 명세서 | [capcut_export_spec.md](capcut_export_spec.md) | 템플릿 기반 드래프트 빌더 |
| 프론트엔드 명세서 | [frontend_spec.md](frontend_spec.md) | 상태 모델 + 컴포넌트 |
| 프로젝트 구조 명세서 | [structure_spec.md](structure_spec.md) | 3 컨테이너 폴더 구조 |
| 테스트 명세서 | [test_spec.md](test_spec.md) | 테스트 범위/케이스 |

### 1-2. 작성 범위 제외 / 폐기
| 문서 | 사유 |
|------|------|
| ~~`db_spec.md`~~ | **DB 미사용 결정으로 폐기.** 영속 데이터는 파일시스템뿐 |
| ~~`deploy_spec.md`~~ | MVP 범위 외 |
| ~~`error_spec.md`~~ | MVP는 에러 핸들링 최소 (추후) |
| ~~`state_spec.md` / `component_spec.md`~~ | `frontend_spec.md`로 통합 |
| `env_spec.md` | 필요 시 추가 (현재 각 서버 명세의 환경변수 섹션으로 갈음) |

---

## 2. 네이밍 규칙 — "레이어별 1컨벤션 고정 + 경계 변환"

> **목표:** snake_case를 강제하는 게 아니라, `userId` ↔ `user_id` 처럼 **같은 개념의 이름이 왔다갔다 하는 문제를 박멸**하는 것.
> 핵심 원칙: 각 레이어는 **그 생태계의 관례 컨벤션 하나만** 쓰고, 레이어 경계를 넘을 때 **정해진 한 곳에서만 변환**한다.

**확정 기술 스택:** 백엔드 = Node.js · 프론트 = React · AI 서버 = FastAPI(Python)

### 2-1. 레이어별 컨벤션 (각 레이어 안에서는 100% 통일)
| 레이어 | 컨벤션 | 예시 | 근거 |
|--------|--------|------|------|
| 백엔드 코드 (Node.js) | `camelCase` | `generateTts`, `sceneList` | JS 관례 |
| AI 서버 코드 (FastAPI/Python) | `snake_case` | `generate_tts`, `scene_list` | Python 관례 |
| **API JSON (wire format)** | **`snake_case` (확정)** | `scene_number`, `tts_url` | 단일 진실 |
| 프론트 코드 (React) | `camelCase` | `sceneList`, `currentSceneId` | JS/TS 관례 |
| 환경변수 | `UPPER_SNAKE_CASE` | `GIPHY_API_KEY` | OS 관례 |
| 상수 | `UPPER_SNAKE_CASE` | `MAX_SCENE_COUNT` | 공통 관례 |

> DB 레이어가 사라졌으므로 식별자 기준점은 **API JSON(snake_case)** 이다. 모든 JSON 구조 명세는 이 표기를 따른다.

### 2-2. 경계 변환 규칙 (flip-flop 박멸의 핵심)
**API JSON = `snake_case` 확정.** 이를 기준으로 각 경계의 변환 위치를 고정한다.

| 경계 | 변환 | 변환 위치 |
|------|------|-----------|
| Node 백엔드(camel) ↔ API JSON(snake) | 필요 | 직렬화 레이어 한 곳에서만 (응답 직렬화 미들웨어) |
| API JSON(snake) ↔ 프론트(camel) | 필요 | API 클라이언트 한 레이어에서만 |
| AI 서버(snake) ↔ API JSON(snake) | **불필요** | Python 내부 = wire 동일, 변환 0 |

- 변환은 **자동(직렬화 설정/매퍼)** 으로 처리하고, 개별 코드에서 수동으로 키 이름을 바꾸지 않는다.
- 한 번 정한 wire format(snake_case)은 **모든 API가 예외 없이** 따른다 — 이게 일관성의 본체.

### 2-3. 같은 개념 = 같은 이름 (표기만 변환, 단어는 불변)
- 한 개념은 프로젝트 전체에서 **같은 단어/순서**를 쓴다. 표기(케이스)만 레이어 규칙대로 변환된다.
- 예: 장면 식별자는 어디서나 `scene_number`/`sceneNumber` (○) — `sceneIdx`, `sceneNo` 같은 **동의어 난립 금지** (✗).
- 접미사 규칙: 시간=`*_at`/`*At`, 불리언=`is_*`/`has_*`, 개수=`*_count`, 경로=`*_path`, URL=`*_url`, 길이(µs)=`*_duration`.

### 2-4. 약어 사전 (확장 예정)
| 약어 | 의미 |
|------|------|
| `tts` | text to speech |
| `srt` | subtitle (SubRip) |
| `img` | image |
| `gif` | gif asset |
| `ai` | AI 생성 |

### 2-5. 파일/경로 (생태계 관례 허용)
| 대상 | 규칙 |
|------|------|
| API 경로 | `kebab-case` / 콜론 액션(`/scenes:split`) — 단일 고정 |
| 백엔드 파일 | `camelCase.역할.js` (`scene.service.js`) |
| AI 서버 파일 | `snake_case.py` (`gemini_service.py`) |
| 프론트 컴포넌트 파일 | React 관례 (`SceneList.tsx`, PascalCase) |
| 명세서 파일명 | `snake_case` + `_spec.md` |

---

## 3. 도메인 핵심 엔터티 (프론트 상태 = SSOT)

> DB가 없으므로 엔터티는 **프론트 상태 객체**로 존재한다. 모든 명세서가 동일한 이름/구조를 공유한다.
> 식별자는 프론트가 생성하는 클라이언트 ID(`scene_number`, `subtitle_number` 등 순번 기반)를 쓴다.

| 엔터티 | 형태 | 설명 |
|--------|------|------|
| 장면 | `scene` | `{ scene_number, subtitles[], asset, tts }` |
| 자막 | `subtitle` | `{ subtitle_number, text }` |
| 에셋 | `asset` | `{ asset_id, source_type, local_path, width, height }` — `source_type`: `gif`/`image`/`ai`/`upload` |
| TTS | `tts` | `{ tts_id, local_path, duration }` (duration = 텀제거 후, µs) |

상세 구조는 [frontend_spec.md](frontend_spec.md) · [api_contract_spec.md](api_contract_spec.md) 참조.

---

## 4. 백엔드 엔드포인트 (확정 9개)

| # | 엔드포인트 | 역할 | 다운스트림 |
|---|-----------|------|-----------|
| 1 | `POST /scenes:split` | 대본 → 장면 JSON | AI(Gemini) |
| 2 | `POST /scenes/keywords` | 자막 → 검색 키워드 (새로고침) | AI(Gemini) |
| 3 | `GET /search/gifs?q=` | GIF 검색 | Giphy |
| 4 | `GET /search/images?q=` | 이미지 검색 | SerpAPI |
| 5 | `POST /scenes/image-prompts` | 장면 → 프롬프트 5개 | AI(Gemini) |
| 6 | `POST /images/generate` | 프롬프트 → 이미지 | AI(fal.ai 나노바나나) |
| 7 | `POST /videos/generate` | 프롬프트 → 동영상 | AI(fal.ai Wan 2.5) |
| 8 | `POST /assets/download` | url → 로컬 저장 | 파일시스템 |
| 9 | `POST /assets/upload` | 이미지/동영상 업로드 저장 | 파일시스템 |
| 10 | `POST /tts` | 장면 자막 → mp3 + 자막 타이밍 | AI(Typecast) |
| 11 | `POST /export` | 전체상태 → CapCut zip | 템플릿/파일시스템 |

상세 계약은 [api_contract_spec.md](api_contract_spec.md).

---

## 5. 작성 순서 (확정 · DB 제거 반영)

> **원칙: 워크플로우 / JSON 구조가 모든 것을 정의한다.**

1. `flow_spec.md` — 전체 워크플로우 (기준점)
2. `ai_server_spec.md` — AI 엔드포인트 + 모든 JSON 구조
3. `api_contract_spec.md` + `backend_spec.md` — 백엔드 9개 엔드포인트
4. `external_api_spec.md` — Giphy/SerpAPI/fal.ai/ElevenLabs
5. `capcut_export_spec.md` — 템플릿 빌더
6. `frontend_spec.md` — 상태 모델 + 컴포넌트
7. `structure_spec.md` — 폴더 구조
8. `test_spec.md` — 작성 범위의 마지막

---

## 6. 확정 현황

- ✅ API JSON wire format = `snake_case`
- ✅ 스택: 백엔드 Node.js · 프론트 React · AI 서버 FastAPI
- ✅ AI 서버 소유: Gemini(분할·키워드·프롬프트) · **Typecast(TTS, 자막 타임스탬프)** · fal.ai(나노바나나 이미지 + Wan 2.5 동영상)
- ✅ 백엔드 소유: Giphy · SerpAPI · 파일저장(이미지/gif/동영상/TTS) · CapCut export
- ✅ **DB 없음** — 작업 상태는 프론트 SSOT, 백엔드 stateless
- ✅ TTS = 장면 단위(자막 합쳐) + **Typecast `/with-timestamps` → 자막별 정확 타이밍**(글자수 추정 폐기). 속도 env `TTS_SPEED`.
- ✅ 에셋 = gif(Giphy) · 이미지(SerpAPI) · AI이미지(fal) · **AI동영상(fal Wan)** · **업로드(이미지/동영상)**. 동영상은 무음(volume 0), TTS가 오디오.
- ✅ 추천 = 새로고침 시 키워드 재추출 후 검색 + 직접 검색 가능
- ✅ Export = `0615` 템플릿 기반, 에셋 폴더 수집, 세로 1080×1920, 글자수비례 자막, SRT 동봉
- ✅ 범위: 테스트까지 (배포·에러·DB 명세 제외)
