/** Giphy 검색 래퍼. (external_api_spec §1) */
const axios = require('axios');
const config = require('../config');

const SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';

/** → 통일 형태 results[] (width/height는 문자열이라 parseInt 필수) */
async function search(q) {
  // Giphy q 최대 ~50자 — 초과 시 414(URI Too Long). 안전하게 캡.
  const query = (q || '').trim().slice(0, 50);
  const { data } = await axios.get(SEARCH_URL, {
    params: { api_key: config.giphyApiKey, q: query, limit: config.giphyLimit, rating: 'pg-13' },
  });
  return (data.data || []).map((item) => ({
    sourceUrl: item.images.original.url,
    thumbnailUrl: item.images.fixed_width.url,
    width: parseInt(item.images.original.width, 10),
    height: parseInt(item.images.original.height, 10),
  }));
}

module.exports = { search };
