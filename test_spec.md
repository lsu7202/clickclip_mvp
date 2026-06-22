# 테스트 명세서 (test_spec.md)

MVP 테스트 범위와 핵심 케이스. 작성 범위의 마지막 문서.

- 상위: [md.md](md.md) · 흐름: [flow_spec.md](flow_spec.md)
- MVP 원칙: **핵심 변환·계산 로직 위주**로 가볍게. 외부 API는 모킹.

---

## 1. 우선순위 (무엇을 반드시 테스트하나)

| 우선 | 대상 | 이유 |
|------|------|------|
| ★★★ | export 타이밍 계산 | 틀리면 영상이 깨짐 (가장 중요) |
| ★★★ | snake↔camel 변환 | flip-flop 박멸의 핵심 |
| ★★★ | export 빌더(템플릿 채우기) | 산출물 유효성 |
| ★★ | TTS 텀 제거 후 duration 반영 | 타이밍 정확도 |
| ★★ | 장면/자막 번호 재정렬 | 편집 일관성 |
| ★ | 외부 API 응답 매핑 | 결과 표시 |

---

## 2. 단위 테스트

### 2-1. 케이스 변환 (`serializers/case.js`, `api/client.js`)
- `toSnakeCaseDeep({ sceneNumber, ttsUrl })` → `{ scene_number, tts_url }`
- `toCamelCaseDeep` 역방향
- 중첩 객체/배열 깊은 변환
- **라운드트립**: camel → snake → camel === 원본

### 2-2. export 타이밍 (capcut_export §4)
- 장면 길이 = `tts.duration` 반영
- `scene_start[i]` = 이전 길이 누적합
- 전체 `duration` = 합계
- 자막 글자수 비례 분배: 합이 `scene_duration`과 일치(반올림 오차 흡수)
- TTS 없는 장면 → fallback 기본 길이

### 2-3. 번호 재정렬
- 중간 장면 삭제 → `scene_number` 1..N 연속
- 중간 자막 삭제 → `subtitle_number` 연속

### 2-4. SRT 포맷
- µs → `HH:MM:SS,mmm` 변환 정확도(경계값 0, 1초, 1분 등)

---

## 3. 통합 테스트 (외부 모킹)

| 테스트 | 모킹 | 검증 |
|--------|------|------|
| `/scenes:split` | AI 서버 응답 고정 | scenes 구조·번호 |
| `/search/gifs` | Giphy 응답 고정 | `results[]` 통일 형태 매핑 |
| `/search/images` | SerpAPI 응답 고정 | 동일 |
| `/assets/download` | http get 모킹 | 파일 저장 + `local_path` 반환 |
| `/tts` | AI 응답(duration) 고정 | 저장 + duration 전달 |
| `/export` | 실제 템플릿 + 모킹 에셋 | zip 생성, 두 JSON 파싱 가능 |

---

## 4. export 산출물 검증 (★ 핵심)
- 생성된 `draft_info.json` / `draft_meta_info.json`이 **유효 JSON**
- 모든 세그먼트 `material_id`가 존재하는 머티리얼을 가리킴(참조 무결성)
- 모든 `extra_material_refs` UUID가 스캐폴드 풀에 존재
- `duration` = 세그먼트 타이밍 최댓값과 일치
- 경로가 `CAPCUT_DRAFT_ROOT` 기준으로 재작성됨(절대 `~/Downloads` 없음)
- zip 안에 모든 asset/mp3 파일 존재 + `subtitles.srt` 포함

---

## 5. AI 서버 테스트 (Python)
- `schemas` pydantic 검증: 잘못된 구조 거부
- Gemini structured output 파싱(모킹 응답)
- 텀 제거: 무음 구간 입력 → 길이 축소 확인

---

## 6. 비범위 (MVP)
- E2E(브라우저 자동화), 부하/성능, 에러 경로 전수, 실제 외부 API 호출 테스트.
- 실제 CapCut 임포트 동작 검증은 **수동 1회**(생성 zip을 CapCut에 넣어 확인).

---

## 7. 네이밍 (테스트)
- 파일: 대상과 동일 컨벤션 + `.test.js` / `_test.py`
- 케이스명: `대상_조건_기대결과` (예: `timeline_noTts_usesFallbackDuration`)
