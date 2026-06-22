/** Export 컨트롤러 — zip 다운로드. (api_contract §9) */
const exportService = require('../services/export.service');

async function build(req, res, next) {
  try {
    const zipPath = await exportService.build({
      canvas: req.body.canvas,
      scenes: req.body.scenes,
    });
    res.download(zipPath, 'clickclip.zip'); // application/zip
  } catch (e) { next(e); }
}

module.exports = { build };
