/** TTS — AI 서버(Typecast)에서 audio+타이밍 받아 저장. (backend_spec §2) */
const aiClient = require('../clients/ai.client');
const fileStore = require('../storage/fileStore');

async function generate(subtitles) {
  const { audioBase64, duration, subtitleTimings } = await aiClient.generateTts(subtitles);
  const buffer = Buffer.from(audioBase64, 'base64');
  const { ttsId, localPath } = fileStore.saveTts(buffer);
  return { ttsId, localPath, duration, subtitleTimings };
}

module.exports = { generate };
