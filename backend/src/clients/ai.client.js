/** AI 서버(FastAPI) 호출 래퍼. 내부 camel ↔ AI wire snake 변환. (backend_spec §5) */
const axios = require('axios');
const config = require('../config');
const { toSnakeCaseDeep, toCamelCaseDeep } = require('../serializers/case');

// AI 동영상 생성이 느려(수십초~수분) 타임아웃 넉넉히. (sync 유지)
const http = axios.create({ baseURL: config.aiServerUrl, timeout: 300000 });

/** JSON 응답 엔드포인트 (snake → camel) */
async function postJson(path, payload) {
  const { data } = await http.post(path, toSnakeCaseDeep(payload));
  return toCamelCaseDeep(data);
}

const splitScenes = (scriptText) => postJson('/scenes/split', { scriptText });
const extractKeywords = (subtitles) => postJson('/scenes/keywords', { subtitles });
const imagePrompts = (subtitles, sceneDescription) =>
  postJson('/scenes/image-prompts', { subtitles, sceneDescription });
const generateImage = (prompt) => postJson('/images/generate', { prompt });
const generateVideo = (prompt) => postJson('/videos/generate', { prompt });

/** TTS: Typecast 결과 JSON (audio base64 + duration + 자막 타이밍) */
const generateTts = (subtitles) => postJson('/tts', { subtitles });

module.exports = {
  splitScenes,
  extractKeywords,
  imagePrompts,
  generateImage,
  generateVideo,
  generateTts,
};
