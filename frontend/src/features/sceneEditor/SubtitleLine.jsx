import { useAppStore } from '../../store/appStore';

export default function SubtitleLine({ sceneNumber, sub }) {
  const { updateSubtitle, deleteSubtitle, language } = useAppStore();
  const showTrans = language !== 'ko' && sub.translation;
  return (
    <div className="subtitle-line">
      <input
        value={sub.text}
        onChange={(e) => updateSubtitle(sceneNumber, sub.subtitleNumber, e.target.value)}
      />
      {showTrans && <span className="subtitle-trans" title="한국어 번역">{sub.translation}</span>}
      <button onClick={() => deleteSubtitle(sceneNumber, sub.subtitleNumber)} title="자막 삭제">
        🗑
      </button>
    </div>
  );
}
