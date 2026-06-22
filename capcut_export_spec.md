# CapCut Export 명세서 (capcut_export_spec.md)

`POST /export`의 산출물 — CapCut 드래프트 폴더를 **템플릿 기반**으로 생성하는 규칙.

- 상위: [md.md](md.md) · 계약: [api_contract_spec.md](api_contract_spec.md) §9 · 백엔드: [backend_spec.md](backend_spec.md) §6
- 기준 분석 대상: `0615/draft_meta_info.json`, `0615/draft_info.json` (실측).
- 단위: **마이크로초(µs)**, 1초 = 1,000,000. fps 30.

---

## 0. 핵심 전략 — 템플릿 갈아끼우기

빈손 합성 금지. **`0615` 드래프트를 골든 템플릿**으로 두고 가변 부분만 교체한다.
- 스캐폴드(세그먼트당 보조 머티리얼 묶음)는 템플릿 구조를 **복제 + UUID 재부여**.
- CapCut 포맷은 필드가 많고 버전 민감 → from-scratch는 리스크.

---

## 1. 산출물 폴더 구조

```
<draft_name>/                 ← 폴더명 = draft_name (예: 프로젝트명 또는 고정값)
  draft_meta_info.json        ← 미디어 등록부 (경로/머티리얼 교체)
  draft_info.json             ← 타임라인 (트랙·세그먼트·자막 재생성)
  assets/
    images/  *.png|jpg        (photo)
    gifs/    *.gif            (gif)
    audios/  *.mp3            (tts = music)
  subtitles.srt               ← 별도 SRT 동봉
```
→ 최종 `application/zip`으로 응답.

---

## 2. 두 파일의 역할

| 파일 | 역할 |
|------|------|
| `draft_meta_info.json` | 임포트된 미디어 등록부 + 드래프트 신분/경로 |
| `draft_info.json` | 타임라인: `canvas_config`, `materials`(typed pools), `tracks`(segments) |

두 파일은 같은 미디어를 각자의 `id`(UUID) 공간으로 등록한다(상호 id 공유 X, 파일 경로로 연결).

---

## 3. 우리 데이터 → CapCut 매핑

| 우리 (export req) | CapCut metetype/type | materials 풀 | 트랙 | 비고 |
|-------------------|----------------------|--------------|------|------|
| asset(gif) | `gif` | `videos[]` | video | photo 프로토타입 복제 |
| asset(image/ai/upload) | `photo` | `videos[]` | video | photo 프로토타입 |
| **asset(video)** | **`video`** | `videos[]`(type video) | video | **비디오 프로토타입 복제, 무음(volume 0), source_timerange 트림** |
| tts(mp3) | `extract_music` | `audios[]` | audio | |
| subtitle | `subtitle` | `texts[]` | text | |

> 우리 모델: **장면당 비주얼 1개 + TTS 1개 + 자막 N개**.
> 비디오 프로토타입은 템플릿 `0615`에 실제 비디오 클립이 포함돼 있어 거기서 복제(머티리얼 `type:"video"`, `has_audio:true`, 세그먼트 `volume:0`).

---

## 4. 타이밍 모델

- 장면 길이 `scene_duration[i]` = `scenes[i].tts.duration` (텀 제거 후 µs).
  - TTS 없으면 fallback 기본값(예: 3,000,000 = 3초).
- 장면 시작 `scene_start[i]` = Σ(`scene_duration[0..i-1]`).
- 전체 `duration` = Σ `scene_duration`.

### 비주얼 세그먼트 (video 트랙)
```
# 이미지/gif:
target_timerange = { start: scene_start[i], duration: scene_duration[i] }
source_timerange = { start: 0, duration: scene_duration[i] }

# 동영상(asset.duration 보유):
target_timerange = { start: scene_start[i], duration: scene_duration[i] }
source_timerange = { start: 0, duration: min(asset.duration, scene_duration[i]) }  # 앞부분 트림
volume = 0, last_nonzero_volume = 0   # 무음 (오디오는 TTS)
```

### 오디오 세그먼트 (audio 트랙)
```
target_timerange = { start: scene_start[i], duration: scene_duration[i] }
source_timerange = { start: 0, duration: scene_duration[i] }
```

### 자막 세그먼트 (text 트랙) — **Typecast 실제 타이밍 우선**
- `scene.tts.subtitle_timings`(단어 타임스탬프 기반)가 있으면 그대로 사용:
```
각 자막 start = scene_start[i] + timing.start   # timing은 장면 음성 내 상대 µs
각 자막 dur   = timing.end - timing.start
```
- 없으면(폴백) 글자수 비례 분배:
```
각 자막 dur = scene_duration[i] * len(text)/Σlen(text)
각 자막 start = scene_start[i] + 앞 자막들 dur 누적
```

---

## 5. draft_info.json 생성 규칙

### 5-1. canvas_config (세로 고정)
```json
{ "ratio": "original", "width": 1080, "height": 1920, "background": null }
```
(템플릿은 1920×1080 가로 → 세로로 교체)

### 5-2. materials 풀
각 에셋/자막마다 **메인 머티리얼 1개 + 스캐폴드 묶음**을 생성(UUID 신규).

**videos[] (photo/gif)**
```json
{ "id": "<uuid>", "type": "photo"|"gif", "path": "<재작성 경로>",
  "material_name": "<파일명>", "width": <w>, "height": <h>,
  "duration": <원본 µs>, "crop": {기본}, "category_name": "local", ... }
```

**audios[] (tts)**
```json
{ "id": "<uuid>", "type": "extract_music", "name": "<파일명>",
  "path": "<재작성 경로>", "duration": <tts.duration> }
```

**texts[] (subtitle)** — `content`는 스타일 박힌 stringified JSON
```json
{ "id": "<uuid>", "type": "subtitle", "recognize_text": "<자막 text>",
  "content": "{\"styles\":[{\"fill\":{...},\"font\":{\"path\":\"<폰트경로>\"},\"range\":[0,N],\"size\":7.0}],\"text\":\"<자막 text>\"}",
  "base_content": "<위와 동일>" }
```
- **기본 스타일 1종 고정**(흰색/지정 폰트/size). `words`(단어별 카라오케 타이밍)는 **생략**.
- `range`는 `[0, 글자수]`.

### 5-3. 스캐폴드 머티리얼 (세그먼트당 필수 보조)
세그먼트는 `material_id`(메인) + `extra_material_refs[]`(스캐폴드)로 구성. 템플릿에서 한 묶음 복제 + UUID 재부여.

| 세그먼트 종류 | 필요한 extra refs (각 UUID 신규) |
|---------------|----------------------------------|
| 비주얼(video) | speed, placeholder_info, canvas, material_animation, sound_channel_mapping, material_color, vocal_separation |
| 오디오(audio) | speed, placeholder_info, beat, sound_channel_mapping, vocal_separation |
| 자막(text) | material_animation |

각 스캐폴드 머티리얼의 내부 값은 템플릿 기본값을 그대로 복제(speed=1.0 등).

### 5-4. tracks
```
track(video): 비주얼 세그먼트들 (start 누적)
track(text):  자막 세그먼트들
track(audio): TTS 세그먼트들
```
세그먼트 공통 필드: `id`(uuid), `material_id`, `extra_material_refs[]`, `target_timerange`, `source_timerange`, `clip`(기본 transform), `render_index`, `speed:1.0`, `volume:1.0`.

### 5-5. 상단 메타
`duration`(총합), `fps:30`, `canvas_config`, `id`(새 draft uuid), `create_time`/`update_time`(export 시각, 백엔드에서 주입 — 워크플로 외부에서 스탬프).

---

## 6. draft_meta_info.json 생성 규칙

미디어 등록부. `draft_materials[0].value`에 각 에셋 1줄 등록:
```json
{ "id": "<uuid>", "metetype": "photo"|"gif"|"music",
  "extra_info": "<파일명>", "file_Path": "<재작성 절대경로>",
  "duration": <µs>, "width": <w>, "height": <h>,
  "roughcut_time_range": { "start": 0, "duration": <µs> }, ... }
```
- 잡다한 필드(`draft_cloud_*`, purchase, tutorial, enterprise 등) = 템플릿 기본값 유지.
- `draft_name`/`draft_id`/`draft_root_path`/`draft_fold_path`/`tm_duration` = 새 값으로 교체.

---

## 7. 경로 재작성 (이식성) — **전부 env 기반**

CapCut은 절대경로 기반이라 상대경로는 미디어 오프라인 위험. 그래서 호스트별 절대경로를 **env로 1회 설정**해 생성한다. 컴퓨터마다 다른 값은 템플릿에서 가져오지 않고 **항상 env로 덮어쓴다** (템플릿엔 원작자 경로가 박혀있으므로).

**경로 필드 전수 (템플릿 기준):**
| 파일 | 필드 | 처리 |
|------|------|------|
| meta | `draft_root_path` | = `CAPCUT_DRAFT_ROOT` |
| meta | `draft_fold_path` | = `CAPCUT_DRAFT_ROOT/<draft_name>` |
| meta | `draft_materials[].value[].file_Path` | = 드래프트 내 assets 경로 |
| info | `materials.videos[].path` | = 드래프트 내 assets 경로 |
| info | `materials.audios[].path` | = 드래프트 내 assets 경로 |
| info | `materials.texts[].font_path` | = `CAPCUT_FONT_PATH` |
| info | `materials.texts[].content`(JSON 내 `font.path`) | = `CAPCUT_FONT_PATH` |

```
에셋 경로 = <CAPCUT_DRAFT_ROOT>/<draft_name>/assets/<images|gifs|audios>/<file>
```

**env (backend, 컴퓨터마다 1회):**
- `CAPCUT_DRAFT_ROOT` = 사용자의 `com.lveditor.draft` 폴더 (Mac: `/Users/<you>/Movies/CapCut/User Data/Projects/com.lveditor.draft`).
- `CAPCUT_FONT_PATH` = CapCut 시스템 폰트 (Mac 기본값 제공).

> 검증: 빌더 출력에 원작자 경로(`/Users/iseung-ug`, `/Applications/CapCut.app`) **누수 0건** 확인.

---

## 8. subtitles.srt 생성

자막 세그먼트 타이밍(§4)을 SRT로 출력(µs → `HH:MM:SS,mmm`):
```
1
00:00:00,366 --> 00:00:02,433
너네 아직도

2
...
```
- draft_info의 text 세그먼트와 **동일 타이밍** 사용.

---

## 9. 빌드 절차 요약 (exportService.build)
```
1. CAPCUT_TEMPLATE_DIR(0615) → 작업 폴더로 복제
2. state.scenes 순회:
     - asset 파일 → assets/<type>/  복사, 경로 재작성
     - tts 파일   → assets/audios/  복사
3. 타이밍 계산(§4)
4. draft_info.json 재생성(§5)
5. draft_meta_info.json 재생성(§6)
6. subtitles.srt 생성(§8)
7. 폴더 zip → 응답
```

## 10. 결정 고정값 / 비범위
- 고정: 세로 1080×1920 · 글자수비례 자막 · 기본 자막 스타일 1종 · words 생략 · TTS 길이 = 장면 길이.
- 비범위(MVP): 전환효과·애니메이션·BGM·다중 비주얼/장면·키프레임.
