/** 검색 컨트롤러. (api_contract §3·4) */
const searchService = require('../services/search.service');

async function gifs(req, res, next) {
  try {
    res.json({ results: await searchService.gifs(req.query.q) });
  } catch (e) { next(e); }
}

async function images(req, res, next) {
  try {
    res.json({ results: await searchService.images(req.query.q) });
  } catch (e) { next(e); }
}

module.exports = { gifs, images };
