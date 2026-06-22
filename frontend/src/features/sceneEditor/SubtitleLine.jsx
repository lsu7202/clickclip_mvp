import { useAppStore } from '../../store/appStore';

export default function SubtitleLine({ sceneNumber, sub }) {
  const { updateSubtitle, deleteSubtitle } = useAppStore();
  return (
    <div className="subtitle-line">
      <input
        value={sub.text}
        onChange={(e) => updateSubtitle(sceneNumber, sub.subtitleNumber, e.target.value)}
      />
      <button onClick={() => deleteSubtitle(sceneNumber, sub.subtitleNumber)} title="자막 삭제">
        🗑
      </button>
    </div>
  );
}
