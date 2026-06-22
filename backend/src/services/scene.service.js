/** 장면 관련 — AI 서버 프록시. (backend_spec §2) */
const aiClient = require('../clients/ai.client');

const split = (scriptText) => aiClient.splitScenes(scriptText);
const keywords = (subtitles) => aiClient.extractKeywords(subtitles);
const imagePrompts = (subtitles, sceneDescription) =>
  aiClient.imagePrompts(subtitles, sceneDescription);

module.exports = { split, keywords, imagePrompts };
