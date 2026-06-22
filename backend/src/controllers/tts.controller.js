/** TTS 컨트롤러. (api_contract §8) */
const ttsService = require('../services/tts.service');

async function generate(req, res, next) {
  try {
    res.json(await ttsService.generate(req.body.subtitles));
  } catch (e) { next(e); }
}

module.exports = { generate };
