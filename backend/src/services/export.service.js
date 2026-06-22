/**
 * Export — 0615 템플릿 복제 → 가변부 교체 → zip. (capcut_export_spec §9)
 * 반환: 생성된 zip 파일 절대경로.
 */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const config = require('../config');
const builder = require('./capcutBuilder');

const DRAFT_NAME = 'clickclip';

function readTemplate(name) {
  const p = path.join(config.capcutTemplateDir, name);
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/** µs → SRT 타임코드 HH:MM:SS,mmm */
function srtTime(us) {
  const ms = Math.round(us / 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const millis = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${s},${millis}`;
}

function subDir(sourceType) {
  if (sourceType === 'gif') return 'gifs';
  if (sourceType === 'video') return 'videos';
  return 'images';
}

/** 에셋/tts 파일을 드래프트 폴더로 복사 + capcutPath/fileName 부여한 scenes 반환 */
function collectAssets(scenes, outDir, draftFoldPath) {
  return scenes.map((scene) => {
    const next = { ...scene };
    if (scene.asset) {
      const fileName = path.basename(scene.asset.localPath);
      const dir = subDir(scene.asset.sourceType);
      copyInto(scene.asset.localPath, path.join(outDir, 'assets', dir, fileName));
      next.asset = {
        ...scene.asset,
        fileName,
        capcutPath: `${draftFoldPath}/assets/${dir}/${fileName}`,
      };
    }
    if (scene.tts) {
      const fileName = path.basename(scene.tts.localPath);
      copyInto(scene.tts.localPath, path.join(outDir, 'assets', 'audios', fileName));
      next.tts = {
        ...scene.tts,
        fileName,
        capcutPath: `${draftFoldPath}/assets/audios/${fileName}`,
      };
    }
    return next;
  });
}

function copyInto(relSrc, absDest) {
  const absSrc = path.join(config.workspaceDir, relSrc);
  fs.mkdirSync(path.dirname(absDest), { recursive: true });
  fs.copyFileSync(absSrc, absDest);
}

/** subtitles.srt 생성 (draft_info 자막 타이밍과 동일) */
function buildSrt(scenes) {
  const { timing } = builder.computeTiming(scenes);
  const lines = [];
  let n = 1;
  scenes.forEach((scene, i) => {
    for (const sub of builder.distributeSubtitles(scene, timing[i])) {
      lines.push(String(n++));
      lines.push(`${srtTime(sub.start)} --> ${srtTime(sub.start + sub.duration)}`);
      lines.push(sub.text);
      lines.push('');
    }
  });
  return lines.join('\n');
}

function zipDir(srcDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve(zipPath));
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(srcDir, DRAFT_NAME); // zip 안 최상위 = draftName
    archive.finalize();
  });
}

async function build({ canvas, scenes }) {
  const canvasCfg = canvas || { width: config.canvasWidth, height: config.canvasHeight };

  // 모든 절대경로는 env(CAPCUT_DRAFT_ROOT) 기준으로 생성 — 컴퓨터마다 1회 설정.
  const infoTpl = readTemplate('draft_info.json');
  const metaTpl = readTemplate('draft_meta_info.json');
  const draftRoot = config.capcutDraftRoot; // com.lveditor.draft 폴더
  const draftFoldPath = `${draftRoot}/${DRAFT_NAME}`;

  const exportRoot = path.join(config.workspaceDir, 'export');
  const outDir = path.join(exportRoot, DRAFT_NAME);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // 1. 에셋 수집(복사) + 경로 재작성
  const enriched = collectAssets(scenes, outDir, draftFoldPath);

  // 2. 템플릿 기반 JSON 생성
  const draftInfo = builder.buildDraftInfo(infoTpl, enriched, canvasCfg, config.capcutFontPath);
  const draftMeta = builder.buildDraftMeta(metaTpl, enriched, DRAFT_NAME, draftFoldPath, draftRoot);

  fs.writeFileSync(path.join(outDir, 'draft_info.json'), JSON.stringify(draftInfo));
  fs.writeFileSync(path.join(outDir, 'draft_meta_info.json'), JSON.stringify(draftMeta));

  // 3. SRT
  fs.writeFileSync(path.join(outDir, 'subtitles.srt'), buildSrt(enriched));

  // 4. zip
  const zipPath = path.join(exportRoot, `${DRAFT_NAME}.zip`);
  fs.rmSync(zipPath, { force: true });
  await zipDir(outDir, zipPath);
  return zipPath;
}

module.exports = { build };
