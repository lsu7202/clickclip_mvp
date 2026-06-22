import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { fetchImagePrompts } from '../../api/scenes.api';
import { generateAiVideo } from '../../api/assets.api';

/** AI 동영상 생성 (fal Wan 2.5). 프롬프트 추천은 이미지용과 공유. */
export default function AiVideoPanel({ scene }) {
  const { setSceneAsset, assetPanel, setPanel } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchImagePrompts(scene.subtitles, scene.sceneDescription).then((prompts) =>
      setPanel({ prompts }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.sceneNumber]);

  const onGenerate = async (p) => {
    if (!p.trim()) return;
    setLoading(true);
    try {
      setSceneAsset(scene.sceneNumber, await generateAiVideo(p));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {(assetPanel.prompts || []).map((p, i) => (
        <button key={i} className="prompt-item" onClick={() => setPrompt(p)}>
          {p}
        </button>
      ))}
      <div className="searchbar">
        <input
          value={prompt}
          placeholder="동영상 프롬프트 직접 작성"
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button onClick={() => onGenerate(prompt)} disabled={loading}>
          {loading ? '생성 중…(수십초)' : '생성'}
        </button>
      </div>
    </div>
  );
}
