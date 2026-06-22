import { useAppStore } from '../../store/appStore';
import { exportDraft } from '../../api/export.api';
import SceneRow from './SceneRow.jsx';

const CANVAS = { width: 1080, height: 1920 };

export default function SceneList() {
  const { scenes, addScene } = useAppStore();

  const onDownload = () => exportDraft(CANVAS, scenes);

  return (
    <div>
      {scenes.map((s) => (
        <SceneRow key={s.sceneNumber} scene={s} />
      ))}
      <div className="scene-actions">
        <button onClick={addScene}>＋ 장면 추가</button>
        <button onClick={onDownload}>다운로드</button>
      </div>
    </div>
  );
}
