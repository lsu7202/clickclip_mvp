/** 장면 관련 — AI 서버 프록시. (backend_spec §2) */
const aiClient = require('../clients/ai.client');

const split = (scriptText, language) => aiClient.splitScenes(scriptText, language);
const keywords = (subtitles) => aiClient.extractKeywords(subtitles);
const translate = (subtitles) => aiClient.translateSubtitles(subtitles);
const imagePrompts = (subtitles, sceneDescription) =>
  aiClient.imagePrompts(subtitles, sceneDescription);

module.exports = { split, keywords, translate, imagePrompts };
