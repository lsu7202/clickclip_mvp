import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { splitScript } from '../../api/scenes.api';

export default function ScriptInputStep() {
  const { scriptText, setScriptText, loadScenes, language, setLanguage } = useAppStore();
  const [loading, setLoading] = useState(false);

  const onContinue = async () => {
    if (!scriptText.trim()) return;
    setLoading(true);
    try {
      loadScenes(await splitScript(scriptText, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="script-step">
      <div>
        언어:&nbsp;
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="ko">한국어</option>
          <option value="ja">일본어</option>
        </select>
      </div>
      <textarea
        placeholder="대본 직접입력"
        value={scriptText}
        onChange={(e) => setScriptText(e.target.value)}
      />
      <button className="continue" onClick={onContinue} disabled={loading}>
        {loading ? '분할 중…' : '계속하기'}
      </button>
    </div>
  );
}
