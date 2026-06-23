import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { assetUrl } from '../../api/client';
import { generateTts } from '../../api/tts.api';

export default function TtsControls({ scene }) {
  const setSceneTts = useAppStore((s) => s.setSceneTts);
  const language = useAppStore((s) => s.language);
  const [loading, setLoading] = useState(false);

  const onGenerate = async () => {
    if (!scene.subtitles.some((s) => s.text.trim())) return;
    setLoading(true);
    try {
      setSceneTts(scene.sceneNumber, await generateTts(scene.subtitles, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 6 }}>
      <button onClick={onGenerate} disabled={loading}>
        {loading ? 'tts 생성 중…' : 'tts 생성'}
      </button>
      {scene.tts && (
        <audio controls src={assetUrl(scene.tts.localPath)} style={{ height: 28, marginLeft: 8 }} />
      )}
    </div>
  );
}
