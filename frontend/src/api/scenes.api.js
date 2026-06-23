import client from './client';

export const splitScript = (scriptText, language) =>
  client.post('/scenes/split', { scriptText, language }).then((r) => r.data.scenes);

export const refreshKeywords = (subtitles) =>
  client.post('/scenes/keywords', { subtitles }).then((r) => r.data.searchKeywords);

export const translateSubtitles = (subtitles) =>
  client.post('/scenes/translate', { subtitles }).then((r) => r.data.translations);

export const fetchImagePrompts = (subtitles, sceneDescription) =>
  client.post('/scenes/image-prompts', { subtitles, sceneDescription }).then((r) => r.data.prompts);
