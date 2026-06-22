/**
 * 작업 상태 SSOT. (frontend_spec §1·3) — DB 없음, 새로고침 시 소멸.
 */
import { create } from 'zustand';

const renumberScenes = (scenes) =>
  scenes.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
const renumberSubs = (subs) =>
  subs.map((s, i) => ({ ...s, subtitleNumber: i + 1 }));

const emptyScene = (n) => ({
  sceneNumber: n,
  subtitles: [],
  searchKeywords: [],
  sceneDescription: '',
  asset: null,
  tts: null,
});

export const useAppStore = create((set, get) => ({
  step: 'script',
  scriptText: '',
  scenes: [],
  selectedSceneNumber: null,
  assetPanel: { open: false, tab: 'gif', query: '', results: [], prompts: [] },

  setScriptText: (scriptText) => set({ scriptText }),

  // 1단계 → 2단계: split 결과 로드 (asset/tts=null 부착)
  loadScenes: (scenes) =>
    set({
      step: 'editor',
      scenes: scenes.map((s) => ({ ...s, asset: null, tts: null })),
    }),

  // --- 구조 편집 (서버 호출 없음) ---
  addScene: () =>
    set((st) => ({ scenes: renumberScenes([...st.scenes, emptyScene(st.scenes.length + 1)]) })),
  deleteScene: (sceneNumber) =>
    set((st) => ({ scenes: renumberScenes(st.scenes.filter((s) => s.sceneNumber !== sceneNumber)) })),

  addSubtitle: (sceneNumber) =>
    set((st) => ({
      scenes: st.scenes.map((s) =>
        s.sceneNumber === sceneNumber
          ? { ...s, subtitles: renumberSubs([...s.subtitles, { subtitleNumber: 0, text: '' }]) }
          : s,
      ),
    })),
  deleteSubtitle: (sceneNumber, subtitleNumber) =>
    set((st) => ({
      scenes: st.scenes.map((s) =>
        s.sceneNumber === sceneNumber
          ? { ...s, subtitles: renumberSubs(s.subtitles.filter((x) => x.subtitleNumber !== subtitleNumber)) }
          : s,
      ),
    })),
  updateSubtitle: (sceneNumber, subtitleNumber, text) =>
    set((st) => ({
      scenes: st.scenes.map((s) =>
        s.sceneNumber === sceneNumber
          ? {
              ...s,
              subtitles: s.subtitles.map((x) =>
                x.subtitleNumber === subtitleNumber ? { ...x, text } : x,
              ),
            }
          : s,
      ),
    })),

  // --- 에셋/TTS 적용 ---
  setSceneAsset: (sceneNumber, asset) =>
    set((st) => ({
      scenes: st.scenes.map((s) => (s.sceneNumber === sceneNumber ? { ...s, asset } : s)),
    })),
  setSceneTts: (sceneNumber, tts) =>
    set((st) => ({
      scenes: st.scenes.map((s) => (s.sceneNumber === sceneNumber ? { ...s, tts } : s)),
    })),

  // --- 우측 패널 ---
  selectScene: (sceneNumber) =>
    set((st) => ({ selectedSceneNumber: sceneNumber, assetPanel: { ...st.assetPanel, open: true } })),
  setPanel: (patch) => set((st) => ({ assetPanel: { ...st.assetPanel, ...patch } })),

  selectedScene: () => get().scenes.find((s) => s.sceneNumber === get().selectedSceneNumber) || null,
}));
