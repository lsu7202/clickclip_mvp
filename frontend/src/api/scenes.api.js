import client from './client';

export const splitScript = (scriptText) =>
  client.post('/scenes/split', { scriptText }).then((r) => r.data.scenes);

export const refreshKeywords = (subtitles) =>
  client.post('/scenes/keywords', { subtitles }).then((r) => r.data.searchKeywords);

export const fetchImagePrompts = (subtitles, sceneDescription) =>
  client.post('/scenes/image-prompts', { subtitles, sceneDescription }).then((r) => r.data.prompts);
