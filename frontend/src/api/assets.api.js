import client from './client';

export const downloadAsset = (sourceUrl, sourceType) =>
  client.post('/assets/download', { sourceUrl, sourceType }).then((r) => r.data);

export const generateAiImage = (prompt) =>
  client.post('/images/generate', { prompt }).then((r) => r.data);

export const generateAiVideo = (prompt) =>
  client.post('/videos/generate', { prompt }).then((r) => r.data);

export const uploadAsset = (file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post('/assets/upload', form).then((r) => r.data);
};
