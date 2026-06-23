/** 장면 컨트롤러. (api_contract §1·2·5) */
const sceneService = require('../services/scene.service');

async function split(req, res, next) {
  try {
    res.json(await sceneService.split(req.body.scriptText, req.body.language));
  } catch (e) { next(e); }
}

async function keywords(req, res, next) {
  try {
    res.json(await sceneService.keywords(req.body.subtitles));
  } catch (e) { next(e); }
}

async function translate(req, res, next) {
  try {
    res.json(await sceneService.translate(req.body.subtitles));
  } catch (e) { next(e); }
}

async function imagePrompts(req, res, next) {
  try {
    res.json(await sceneService.imagePrompts(req.body.subtitles, req.body.sceneDescription));
  } catch (e) { next(e); }
}

module.exports = { split, keywords, translate, imagePrompts };
