/** 에셋 컨트롤러. (api_contract §6·7) */
const assetService = require('../services/asset.service');

async function download(req, res, next) {
  try {
    res.json(await assetService.download(req.body.sourceUrl, req.body.sourceType));
  } catch (e) { next(e); }
}

async function generateImage(req, res, next) {
  try {
    res.json(await assetService.generateImage(req.body.prompt));
  } catch (e) { next(e); }
}

async function generateVideo(req, res, next) {
  try {
    res.json(await assetService.generateVideo(req.body.prompt));
  } catch (e) { next(e); }
}

/** multipart 업로드 (multer가 req.file 주입) */
async function upload(req, res, next) {
  try {
    const { buffer, mimetype, originalname } = req.file;
    res.json(await assetService.upload(buffer, mimetype, originalname));
  } catch (e) { next(e); }
}

module.exports = { download, generateImage, generateVideo, upload };
