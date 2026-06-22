import { useAppStore } from '../../store/appStore';
import { assetUrl } from '../../api/client';
import SubtitleLine from './SubtitleLine.jsx';
import TtsControls from './TtsControls.jsx';

export default function SceneRow({ scene }) {
  const { selectScene, addSubtitle, deleteScene } = useAppStore();
  const n = scene.sceneNumber;

  return (
    <div className="scene-row">
      {scene.asset && scene.asset.sourceType === 'video' ? (
        <video
          className="scene-thumb"
          src={assetUrl(scene.asset.localPath)}
          muted
          onClick={() => selectScene(n)}
          title="클릭하여 에셋 선택"
        />
      ) : (
        <img
          className="scene-thumb"
          src={scene.asset ? assetUrl(scene.asset.localPath) : undefined}
          alt=""
          onClick={() => selectScene(n)}
          title="클릭하여 에셋 선택"
        />
      )}
      <div className="scene-body">
        <strong>장면 {n}</strong>
        {scene.subtitles.map((sub) => (
          <SubtitleLine key={sub.subtitleNumber} sceneNumber={n} sub={sub} />
        ))}
        <button onClick={() => addSubtitle(n)}>＋ 자막 추가</button>
        <TtsControls scene={scene} />
      </div>
      <button
        style={{ position: 'absolute', top: 4, right: 4 }}
        onClick={() => deleteScene(n)}
        title="장면 삭제"
      >
        🗑
      </button>
    </div>
  );
}
