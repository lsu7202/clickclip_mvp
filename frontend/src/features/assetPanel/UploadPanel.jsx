import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { uploadAsset } from '../../api/assets.api';

/** 이미지/동영상 직접 업로드 */
export default function UploadPanel({ scene }) {
  const setSceneAsset = useAppStore((s) => s.setSceneAsset);
  const [loading, setLoading] = useState(false);

  const onChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      setSceneAsset(scene.sceneNumber, await uploadAsset(file));
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <input type="file" accept="image/*,video/*" onChange={onChange} disabled={loading} />
      {loading && <p>업로드 중…</p>}
    </div>
  );
}
