/**
 * 파일 저장 — DB 없이 영속=파일시스템. (backend_spec §4)
 * workspace/assets/{images,gifs,audios}/<id>.<ext>
 * 반환 localPath는 workspace 기준 상대경로.
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');
const sharp = require('sharp');
const { v4: uuid } = require('uuid');
const config = require('../config');

const execFileP = promisify(execFile);

const DIRS = {
  images: 'assets/images',
  gifs: 'assets/gifs',
  audios: 'assets/audios',
  videos: 'assets/videos',
};

function ensureDir(rel) {
  const abs = path.join(config.workspaceDir, rel);
  fs.mkdirSync(abs, { recursive: true });
  return abs;
}

async function download(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  return Buffer.from(res.data);
}

function writeFile(rel, filename, buffer) {
  const dir = ensureDir(rel);
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `${rel}/${filename}`; // 상대 localPath
}

/** gif: 리사이즈 없이 저장, 첫 프레임 크기 읽기 */
async function saveGif(sourceUrl) {
  const buf = await download(sourceUrl);
  const meta = await sharp(buf).metadata();
  const assetId = uuid();
  const localPath = writeFile(DIRS.gifs, `${assetId}.gif`, buf);
  return { assetId, sourceType: 'gif', localPath, width: meta.width, height: meta.height };
}

/** 이미지 버퍼 저장 (업로드/검색 공용) */
async function saveImageBuffer(buf, sourceType = 'image') {
  const meta = await sharp(buf).metadata();
  const assetId = uuid();
  const localPath = writeFile(DIRS.images, `${assetId}.jpg`, buf);
  return { assetId, sourceType, localPath, width: meta.width, height: meta.height };
}

/** 검색 이미지: 다운로드 후 저장 */
async function saveImage(sourceUrl, sourceType = 'image') {
  const buf = await download(sourceUrl);
  return saveImageBuffer(buf, sourceType);
}

/** AI 이미지: 1080x1920으로 리사이즈 후 저장 (capcut 캔버스 일치) */
async function saveAiImage(sourceUrl) {
  const buf = await download(sourceUrl);
  const resized = await sharp(buf)
    .resize(config.canvasWidth, config.canvasHeight, { fit: 'cover' })
    .png()
    .toBuffer();
  const assetId = uuid();
  const localPath = writeFile(DIRS.images, `${assetId}.png`, resized);
  return {
    assetId,
    sourceType: 'ai',
    localPath,
    width: config.canvasWidth,
    height: config.canvasHeight,
  };
}

/** TTS mp3 바이트 저장 */
function saveTts(buffer) {
  const ttsId = uuid();
  const localPath = writeFile(DIRS.audios, `${ttsId}.mp3`, buffer);
  return { ttsId, localPath };
}

/** ffprobe로 동영상 가로/세로/길이(µs) 추출 */
async function probeVideo(absPath) {
  const { stdout } = await execFileP('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-show_entries', 'format=duration',
    '-of', 'json',
    absPath,
  ]);
  const info = JSON.parse(stdout);
  const stream = (info.streams && info.streams[0]) || {};
  const durSec = parseFloat(info.format && info.format.duration) || 0;
  return {
    width: stream.width || 0,
    height: stream.height || 0,
    duration: Math.round(durSec * 1_000_000), // µs
  };
}

/** 동영상 버퍼 저장 + 메타 추출 */
async function saveVideoBuffer(buffer, ext = 'mp4') {
  const assetId = uuid();
  const localPath = writeFile(DIRS.videos, `${assetId}.${ext}`, buffer);
  const meta = await probeVideo(path.join(config.workspaceDir, localPath));
  return { assetId, sourceType: 'video', localPath, ...meta };
}

/** 외부 url 동영상 다운로드 저장 (AI 동영상 등) */
async function saveVideoFromUrl(sourceUrl) {
  const buf = await download(sourceUrl);
  return saveVideoBuffer(buf, 'mp4');
}

module.exports = {
  saveGif,
  saveImage,
  saveImageBuffer,
  saveAiImage,
  saveTts,
  saveVideoBuffer,
  saveVideoFromUrl,
  ensureDir,
};
