import { useAppStore } from '../../store/appStore';
import { assetUrl } from '../../api/client';

/** 선택된 장면의 에셋 미리보기 (MVP: 정적) */
export default function PreviewPane() {
  const scene = useAppStore((s) => s.selectedScene());
  if (!scene || !scene.asset) return null;
  const src = assetUrl(scene.asset.localPath);
  return scene.asset.sourceType === 'video' ? (
    <video src={src} controls style={{ width: '100%' }} />
  ) : (
    <img src={src} alt="" style={{ width: '100%' }} />
  );
}
