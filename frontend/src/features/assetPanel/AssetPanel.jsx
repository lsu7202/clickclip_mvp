import { useAppStore } from '../../store/appStore';
import { searchGifs, searchImages } from '../../api/search.api';
import { refreshKeywords } from '../../api/scenes.api';
import { downloadAsset } from '../../api/assets.api';
import AiImagePanel from './AiImagePanel.jsx';
import AiVideoPanel from './AiVideoPanel.jsx';
import UploadPanel from './UploadPanel.jsx';

const TABS = [
  { key: 'gif', label: 'gif' },
  { key: 'image', label: '이미지' },
  { key: 'ai', label: 'AI 이미지' },
  { key: 'aivideo', label: 'AI 동영상' },
  { key: 'upload', label: '업로드' },
];

const SEARCH_TABS = ['gif', 'image'];

export default function AssetPanel() {
  const { assetPanel, setPanel, selectedSceneNumber, setSceneAsset } = useAppStore();
  const scene = useAppStore((s) => s.selectedScene());
  const { tab, query, results } = assetPanel;

  if (!scene) return <p>장면의 이미지 칸을 선택하세요.</p>;

  const runSearch = async (q) => {
    const fn = tab === 'gif' ? searchGifs : searchImages;
    setPanel({ results: await fn(q) });
  };

  // 새로고침: 자막 기반 키워드 재추출 → 검색
  const onRefresh = async () => {
    const kws = await refreshKeywords(scene.subtitles);
    const q = kws.join(' ');
    setPanel({ query: q });
    await runSearch(q);
  };

  const onPick = async (item) => {
    const asset = await downloadAsset(item.sourceUrl, tab === 'gif' ? 'gif' : 'image');
    setSceneAsset(selectedSceneNumber, asset);
  };

  return (
    <div>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setPanel({ tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ai' && <AiImagePanel scene={scene} />}
      {tab === 'aivideo' && <AiVideoPanel scene={scene} />}
      {tab === 'upload' && <UploadPanel scene={scene} />}
      {SEARCH_TABS.includes(tab) && (
        <>
          <div className="searchbar">
            <input
              value={query}
              placeholder="직접 검색"
              onChange={(e) => setPanel({ query: e.target.value })}
            />
            <button onClick={() => runSearch(query)}>검색</button>
            <button onClick={onRefresh} title="자막 기반 추천 새로고침">↻</button>
          </div>
          <div className="asset-grid">
            {results.map((r, i) => (
              <img key={i} src={r.thumbnailUrl} alt="" onClick={() => onPick(r)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
