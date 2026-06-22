/** 에셋 — 외부 url 다운로드 저장 / AI 이미지 생성. (backend_spec §2) */
const aiClient = require('../clients/ai.client');
const fileStore = require('../storage/fileStore');

/** 검색 결과(gif/이미지) 선택 → 다운로드 저장 */
async function download(sourceUrl, sourceType) {
  if (sourceType === 'gif') return fileStore.saveGif(sourceUrl);
  return fileStore.saveImage(sourceUrl, sourceType); // image | upload
}

/** AI 이미지: fal 생성(URL) → 1080x1920 리사이즈 저장 */
async function generateImage(prompt) {
  const { imageUrl } = await aiClient.generateImage(prompt);
  return fileStore.saveAiImage(imageUrl);
}

/** AI 동영상: fal Wan 생성(URL) → 다운로드 저장 */
async function generateVideo(prompt) {
  const { videoUrl } = await aiClient.generateVideo(prompt);
  return fileStore.saveVideoFromUrl(videoUrl);
}

/** 업로드: 이미지/동영상 버퍼 저장 (mimetype으로 분기) */
async function upload(buffer, mimetype, originalName) {
  if (mimetype && mimetype.startsWith('video/')) {
    const ext = (originalName.split('.').pop() || 'mp4').toLowerCase();
    return fileStore.saveVideoBuffer(buffer, ext);
  }
  // 이미지: 버퍼 그대로 저장 (source_type=upload)
  return fileStore.saveImageBuffer(buffer, 'upload');
}

module.exports = { download, generateImage, generateVideo, upload };
