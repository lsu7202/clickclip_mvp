# 프론트엔드 명세서 (frontend_spec.md)

React 프론트의 상태 모델 + 컴포넌트 구조. 레이아웃(배치)은 [layout_spec.md](layout_spec.md), 흐름은 [flow_spec.md](flow_spec.md).

- 상위: [md.md](md.md) · 계약: [api_contract_spec.md](api_contract_spec.md)
- 프론트가 **작업 상태 SSOT**를 보유(DB 없음). 내부 코드 = `camelCase`.

---

## 1. 상태 모델 (SSOT)

전역 상태는 `scenes` 하나가 중심. (저장 없음 → 새로고침 시 소멸)

```ts
// 내부는 camelCase. API 경계에서만 snake 변환.
type Subtitle = { subtitleNumber: number; text: string }

type Asset = {
  assetId: string
  sourceType: 'gif' | 'image' | 'ai' | 'upload' | 'video'
  localPath: string
  width: number
  height: number
  duration?: number   // video일 때만 (원본 길이 µs)
}

type SubtitleTiming = { subtitleNumber: number; start: number; end: number } // 장면 음성 내 상대 µs
type Tts = { ttsId: string; localPath: string; duration: number; subtitleTimings: SubtitleTiming[] }

type Scene = {
  sceneNumber: number
  subtitles: Subtitle[]
  searchKeywords: string[]
  sceneDescription: string
  asset: Asset | null
  tts: Tts | null
}

type AppState = {
  step: 'script' | 'editor'
  scriptText: string
  scenes: Scene[]
  selectedSceneNumber: number | null   // 우측 패널의 작업 대상
  assetPanel: { tab: 'gif' | 'image' | 'ai'; query: string; results: SearchResult[]; prompts: string[] }
}
```

- 스토어: Context+useReducer 또는 Zustand (택1, MVP는 가벼운 Zustand 권장).
- **selectedSceneNumber** = 중앙 리스트에서 선택된 장면 → 우측 패널 검색/적용 대상.

---

## 2. API 변환 경계 (flip-flop 박멸)

```
src/api/client.js  ← 여기 한 곳에서만 snake↔camel 변환
  - 응답: snake → camel (deep)
  - 요청: camel → snake (deep)
```
- 모든 컴포넌트/스토어는 `camelCase`만 본다. 직접 fetch 금지, 반드시 `api/` 경유.

---

## 3. 상태 변경 ↔ 동작 매핑

| 동작 | 서버 호출 | 상태 변경 |
|------|-----------|-----------|
| 대본 [계속하기] | `POST /scenes:split` | `scenes` 세팅 + `step='editor'` (각 장면 `asset/tts=null`) |
| 장면 추가 | — | `scenes` push + `sceneNumber` 재부여 |
| 장면 삭제 | — | 제거 + 재정렬 |
| 자막 추가/삭제/수정 | — | 해당 장면 `subtitles` 갱신(수정은 debounce 불필요 — 로컬 상태) |
| 이미지 슬롯 클릭 | — | `selectedSceneNumber` 세팅, 패널 오픈 |
| [새로고침] | `POST /scenes/keywords` → 검색 | `query`=키워드 → `results` 갱신 |
| 직접 검색 | `GET /search/...` | `results` 갱신 |
| 썸네일 클릭 | `POST /assets/download` | 해당 장면 `asset` 세팅 |
| AI 탭 진입 | `POST /scenes/image-prompts` | `prompts` 세팅 |
| AI 생성 | `POST /images/generate` | 해당 장면 `asset` 세팅 |
| [tts 생성] | `POST /tts` (자막 합친 text) | 해당 장면 `tts` 세팅 |
| [다운로드] | `POST /export` | zip 다운로드 (상태 변경 없음) |

> 자막 텍스트 수정은 로컬 상태라 debounce 불필요(서버 안 침). 이전에 논의한 debounce는 DB 저장 전제였고, DB 제거로 무의미.

---

## 4. 컴포넌트 트리

```
<App>
 ├─ <ScriptInputStep>          // step='script'
 │    ├─ <ScriptTextarea>
 │    └─ <ContinueButton>
 └─ <SceneEditor>              // step='editor'  (3컬럼)
      ├─ <PreviewPane>         // 좌: 미리보기
      ├─ <SceneList>           // 중: 장면 리스트
      │    ├─ <SceneRow>       //   썸네일+번호+자막들
      │    │    ├─ <SceneThumbnail>      // 클릭 → 패널
      │    │    ├─ <SubtitleLine>        // ✎수정 / 🗑삭제
      │    │    ├─ <AddSubtitleButton>
      │    │    └─ <DeleteSceneButton>   // hover/선택 시
      │    ├─ <TtsControls>    //   tts 생성 / 듣기
      │    ├─ <AddSceneButton>
      │    └─ <DownloadButton>
      └─ <AssetPanel>          // 우: gif/이미지/AI이미지/AI동영상/업로드 탭
           ├─ <AssetTabs>      // 5탭
           ├─ <SearchBar>      // (gif/이미지) 직접 검색 + 새로고침
           ├─ <AssetGrid>      // (gif/이미지) 결과
           ├─ <AiImagePanel>   // 프롬프트 5개 + 입력 + 생성(이미지)
           ├─ <AiVideoPanel>   // 프롬프트 + 생성(동영상, fal Wan)
           └─ <UploadPanel>    // 이미지/동영상 파일 업로드
```

컴포넌트 파일명 = PascalCase(`SceneRow.tsx`). 배치/버튼 위치 = [layout_spec.md](layout_spec.md).

---

## 5. 폴더 구조 (상세: [structure_spec.md](structure_spec.md))
```
frontend/src/
  api/        client.js, scenes.api.js, search.api.js, assets.api.js, tts.api.js, export.api.js
  store/      appStore.js
  features/
    scriptInput/  ScriptInputStep.tsx, ...
    sceneEditor/  SceneEditor.tsx, SceneList.tsx, SceneRow.tsx, SubtitleLine.tsx, TtsControls.tsx
    assetPanel/   AssetPanel.tsx, AssetTabs.tsx, SearchBar.tsx, AssetGrid.tsx, AiImagePanel.tsx
  components/  // 공용 UI
```

## 6. MVP 비범위
- 저장/복원, 라우팅(단일 화면), 로딩 스피너 외 정교한 진행률, 장면 드래그 정렬, 에러 토스트 정교화.
