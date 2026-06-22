/** 검색 — Giphy / SerpAPI. (backend_spec §2, external_api_spec §1·2) */
const giphy = require('../clients/giphy.client');
const serpapi = require('../clients/serpapi.client');

const gifs = (q) => giphy.search(q);
const images = (q) => serpapi.search(q);

module.exports = { gifs, images };
