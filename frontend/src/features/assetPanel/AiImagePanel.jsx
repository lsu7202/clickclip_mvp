import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { fetchImagePrompts } from '../../api/scenes.api';
import { generateAiImage } from '../../api/assets.api';

export default function AiImagePanel({ scene }) {
  const { setSceneAsset, assetPanel, setPanel } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  // 탭 진입 시 프롬프트 5개 추천
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
      setSceneAsset(scene.sceneNumber, await generateAiImage(p));
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
          placeholder="프롬프트 직접 작성"
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button onClick={() => onGenerate(prompt)} disabled={loading}>
          {loading ? '생성 중…' : '생성'}
        </button>
      </div>
    </div>
  );
}
