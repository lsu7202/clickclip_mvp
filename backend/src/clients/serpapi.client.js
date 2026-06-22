/** SerpAPI Google Images 검색 래퍼. (external_api_spec §2) */
const axios = require('axios');
const config = require('../config');

const SEARCH_URL = 'https://serpapi.com/search.json';

/** → 통일 형태 results[] (width/height는 정수) */
async function search(q) {
  // 과도하게 긴 q는 414(URI Too Long) 유발 → 캡.
  const query = (q || '').trim().slice(0, 100);
  const { data } = await axios.get(SEARCH_URL, {
    params: { engine: config.serpapiEngine, q: query, api_key: config.serpapiKey },
  });
  return (data.images_results || []).map((item) => ({
    sourceUrl: item.original,
    thumbnailUrl: item.thumbnail,
    width: item.original_width,
    height: item.original_height,
  }));
}

module.exports = { search };
