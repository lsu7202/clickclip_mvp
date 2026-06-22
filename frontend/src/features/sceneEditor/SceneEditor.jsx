import PreviewPane from './PreviewPane.jsx';
import SceneList from './SceneList.jsx';
import AssetPanel from '../assetPanel/AssetPanel.jsx';

export default function SceneEditor() {
  return (
    <div className="editor">
      <div className="col preview"><PreviewPane /></div>
      <div className="col"><SceneList /></div>
      <div className="col"><AssetPanel /></div>
    </div>
  );
}
