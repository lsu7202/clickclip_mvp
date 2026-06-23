import client from './client';

// 장면 자막들을 보내 합성 → audio + duration + 자막별 타이밍
export const generateTts = (subtitles, language) =>
  client.post('/tts', { subtitles, language }).then((r) => r.data);
