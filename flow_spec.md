# ClickClip 워크플로우 명세서 (flow_spec.md)

전체 작업 흐름과 단계별 데이터 이동을 정의한다. 모든 다른 명세서(AI/백엔드/프론트/export)의 기준점.

- 상위: [md.md](md.md) · 기능: [spec.md](spec.md) · 레이아웃: [layout_spec.md](layout_spec.md)
- 전제: **DB 없음 / 작업상태는 프론트 SSOT / stateless 백엔드 / 모든 호출 sync / 에러 핸들링 최소(MVP)**

---

## 0. 액터

| 액터 | 역할 |
|------|------|
| Front (React) | 작업 상태 보유(SSOT), UI, 백엔드 호출 |
| Back (Node) | stateless 함수, 파일 저장, export 패키징 |
| AI (FastAPI) | Gemini / ElevenLabs / fal.ai 래퍼 |
| 외부 | Giphy, SerpAPI |

통신 규칙: **Front → Back 만**. AI·외부 API는 전부 Back 뒤에 은닉. 모든 JSON = `snake_case`.

---

## 1. 단계 [0] 진입

- 빈 작업 화면 진입. 프로젝트 생성·로그인·저장 없음.
- 프론트 상태 초기화: `scenes = []`.

---

## 2. 단계 [1] 대본 입력

```
Front: 대본 textarea 입력 → [계속하기]
  └─> Back  POST /scenes:split        { script_text }
        └─> AI  POST /scenes/split    { script_text }
              └─> Gemini (structured output, response_schema 강제)
        <── { scenes: [ { scene_number, subtitles[], search_keywords[], scene_description } ] }
  <── 동일 JSON
Front: 응답을 작업 상태(scenes)로 로드 → 2단계 화면 렌더
```

- 자세한 JSON 구조: [ai_server_spec.md](ai_server_spec.md) §scenes/split
- 이 시점부터 모든 편집은 **프론트 상태에서만** 일어난다.

---

## 3. 단계 [2] 장면 편집

레이아웃: 좌(미리보기) · 중(장면 리스트) · 우(에셋 패널). 상세 배치는 [layout_spec.md](layout_spec.md).

### 3-A. 구조 편집 (서버 호출 없음 — 순수 프론트 상태)

| 동작 | 상태 변경 |
|------|-----------|
| 장면 추가 | `scenes`에 빈 장면 push, `scene_number` 재부여 |
| 장면 삭제 | 해당 장면 제거, `scene_number` 재정렬 |
| 자막 추가 | 해당 장면 `subtitles`에 push, `subtitle_number` 부여 |
| 자막 삭제 | 제거 + `subtitle_number` 재정렬 |
| 자막 수정 | `text` 갱신 |

> 저장 호출 없음. 새로고침하면 작업 상태는 사라짐(MVP 허용).

### 3-B. 에셋 선정 (이미지 슬롯 클릭 → 우측 패널)

#### (1) 추천/검색 — gif 탭 · 이미지 탭
```
[새로고침] 클릭  (자막 수정 후 눌러야 갱신 — 자동 트리거 아님)
  └─> Back  POST /scenes/keywords     { subtitles[] }
        └─> AI  Gemini → { search_keywords[] }     # 자막 기반 재추출
  <── { search_keywords[] }
Front: 검색창 기본값을 search_keywords로 채움 → 검색 실행
```
또는 **직접 검색**: 사용자가 검색창에 직접 입력 → 아래 검색 실행 (키워드 재추출 생략)

```
검색 실행:
  gif 탭   → Back  GET /search/gifs?q=<kw>     → Giphy   → 썸네일 그리드
  이미지 탭 → Back  GET /search/images?q=<kw>   → SerpAPI → 썸네일 그리드
```

#### (2) 선택 → 다운로드 → 즉시 반영
```
썸네일 클릭
  └─> Back  POST /assets/download   { source_url, source_type }
        └─> 파일 다운로드 → 파일시스템 저장
  <── { asset_id, source_type, local_path, width, height }
Front: 해당 장면의 asset = 응답으로 설정 → 화면에 즉시 반영
```

#### (3) AI 이미지 탭 (fal.ai 나노바나나)
```
탭 진입
  └─> Back  POST /scenes/image-prompts   { subtitles[], scene_description }
        └─> AI  Gemini → { prompts: [5개] }
  <── { prompts[] }
Front: 프롬프트 5개 리스트 표시 (선택 가능) + 직접 입력칸

생성 클릭 (선택 or 직접작성 프롬프트)
  └─> Back  POST /images/generate   { prompt }
        └─> AI  fal.ai(나노바나나) → 이미지
        └─> Back: 결과 이미지 파일시스템 저장
  <── { asset_id, source_type:"ai", local_path, width, height }
Front: 해당 장면 asset = 응답 → 즉시 반영
```

### 3-C. TTS (장면 단위)
```
장면의 [tts 생성] 클릭
  └─> Back  POST /tts   { text: <장면 자막들 합친 한 문장> }
        └─> AI  POST /tts   { text }
              └─> ElevenLabs → mp3
              └─> 무음/숨소리 텀 제거 후처리 (잘린 길이가 최종 duration)
        └─> Back: mp3 파일시스템 저장
  <── { tts_id, local_path, duration }    # duration = 텀제거 후, µs
Front: 해당 장면 tts = 응답 → [tts 듣기]로 재생 가능
```

- TTS 입력 문장 = 그 장면 `subtitles[].text`를 순서대로 이어붙인 것.
- 자막을 수정하면 TTS는 stale → 사용자가 다시 [tts 생성] 눌러 재생성.

---

## 4. 단계 [3] 다운로드 (Export)

```
[다운로드] 클릭
  └─> Back  POST /export   { canvas, scenes:[ { scene_number, subtitles[], asset, tts } ] }
        └─> Back:
            1. 0615 템플릿 폴더 복제
            2. assets/ 폴더에 이미지·gif·mp3 수집(복사)
            3. draft_meta_info.json 재생성 (미디어 등록, 경로 재작성)
            4. draft_info.json 재생성 (트랙·세그먼트·타이밍·자막·UUID)
            5. subtitles.srt 생성
            6. 폴더 → zip
  <── zip 파일 다운로드 응답
```

- 타이밍: 장면 길이 = `tts.duration`, 시작점 = 이전 장면 길이 누적합(µs). 자막은 장면 구간 내 글자수 비례 분배.
- 상세 빌드 규칙: [capcut_export_spec.md](capcut_export_spec.md).

---

## 5. 전체 시퀀스 요약

```
[0] 진입
[1] 대본 → /scenes:split → 장면 JSON 로드
[2] 편집 ── 구조편집(프론트 only)
        ├─ 추천: /scenes/keywords → /search/gifs|images → /assets/download
        ├─ AI이미지: /scenes/image-prompts → /images/generate
        └─ TTS: /tts
[3] /export → CapCut zip 다운로드
```

## 6. 데이터 의존성 (무엇이 무엇을 막는가)

| 동작 | 선행 조건 |
|------|-----------|
| 2단계 진입 | `/scenes:split` 완료 |
| TTS 생성 | 장면에 자막 ≥ 1 |
| Export 타이밍 정확 | 모든 장면에 TTS 존재 (없으면 기본 길이 fallback) |
| Export | 각 장면 asset + tts 권장 (없으면 빈 슬롯 처리) |

## 7. MVP 미포함 (의도적 제외)
- 저장/불러오기, 프로젝트 목록, 로그인
- 에러 복구 UX(실패 시 재시도 버튼 등)
- 비동기 작업 큐/진행률 (전부 sync 대기)
- 장면 순서 드래그 재정렬
