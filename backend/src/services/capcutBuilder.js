/**
 * CapCut 드래프트 빌더 — 0615 템플릿을 골든으로 두고 가변부 교체.
 * (capcut_export_spec.md)
 *
 * 핵심: 세그먼트는 혼자 못 선다. 비주얼=7개, 오디오=5개, 자막=1개 스캐폴드 머티리얼을
 * extra_material_refs로 연결한다. 템플릿에서 그 묶음을 복제 + UUID 재부여한다.
 */
const { v4: uuid } = require('uuid');

/** µs 단위 환산 */
const SEC = 1_000_000;
const FALLBACK_SCENE_US = 3 * SEC; // TTS 없을 때

/** 머티리얼 id → {category, item} 인덱스 */
function indexMaterials(materials) {
  const idx = {};
  for (const [category, arr] of Object.entries(materials)) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (item && item.id) idx[item.id] = { category, item };
    }
  }
  return idx;
}

/**
 * 프로토타입 세그먼트 + 그 머티리얼(메인 + 스캐폴드)을 복제, 새 UUID 부여.
 * @returns { segment, mainId, mainMaterial, scaffold: [{category,item}] }
 */
function cloneBundle(protoSegment, materialsIndex) {
  const segment = structuredClone(protoSegment);
  segment.id = uuid();

  // 메인 머티리얼 복제
  const mainEntry = materialsIndex[protoSegment.material_id];
  const mainMaterial = structuredClone(mainEntry.item);
  mainMaterial.id = uuid();
  segment.material_id = mainMaterial.id;

  // 스캐폴드(extra_material_refs) 복제 + ref 재작성
  const scaffold = [];
  segment.extra_material_refs = (protoSegment.extra_material_refs || []).map((refId) => {
    const entry = materialsIndex[refId];
    if (!entry) return refId;
    const clone = structuredClone(entry.item);
    clone.id = uuid();
    scaffold.push({ category: entry.category, item: clone });
    return clone.id;
  });

  return { segment, mainMaterial, scaffold };
}

/** 첫 세그먼트를 프로토타입으로 추출 */
function findTrack(tracks, type) {
  return tracks.find((t) => t.type === type && (t.segments || []).length > 0);
}

/** 머티리얼 type === 'photo'인 비주얼 세그먼트 프로토타입 (이미지/gif용) */
function findPhotoProtoSeg(tracks, materialsIndex) {
  for (const track of tracks) {
    for (const seg of track.segments || []) {
      const m = materialsIndex[seg.material_id];
      if (m && m.item.type === 'photo') return seg;
    }
  }
  return null;
}

/** 머티리얼 type === 'video'인 세그먼트 프로토타입 (동영상용) */
function findVideoClipProtoSeg(tracks, materialsIndex) {
  for (const track of tracks) {
    for (const seg of track.segments || []) {
      const m = materialsIndex[seg.material_id];
      if (m && m.item.type === 'video') return seg;
    }
  }
  return null;
}

/** 장면별 길이/시작 계산 (µs). (capcut_export_spec §4) */
function computeTiming(scenes) {
  let cursor = 0;
  const timing = scenes.map((scene) => {
    const dur = scene.tts && scene.tts.duration ? scene.tts.duration : FALLBACK_SCENE_US;
    const start = cursor;
    cursor += dur;
    return { start, duration: dur };
  });
  return { timing, total: cursor };
}

/**
 * 장면 내 자막 타이밍 → [{start,duration,text}] (절대 µs).
 * Typecast 타임스탬프(scene.tts.subtitleTimings)가 있으면 정확 타이밍 사용,
 * 없으면 글자수 비례로 폴백.
 */
function distributeSubtitles(scene, sceneTiming) {
  const subs = scene.subtitles || [];
  const timings = scene.tts && scene.tts.subtitleTimings;

  if (timings && timings.length) {
    const byNum = new Map(timings.map((t) => [t.subtitleNumber, t]));
    return subs.map((s) => {
      const t = byNum.get(s.subtitleNumber);
      if (!t) return { start: sceneTiming.start, duration: 0, text: s.text };
      // 타이밍은 장면 음성 내 상대값 → 장면 시작에 더해 절대화
      return {
        start: sceneTiming.start + t.start,
        duration: Math.max(0, t.end - t.start),
        text: s.text,
      };
    });
  }

  // 폴백: 글자수 비례
  const totalChars = subs.reduce((n, s) => n + (s.text ? s.text.length : 0), 0) || 1;
  let cursor = sceneTiming.start;
  return subs.map((s) => {
    const dur = Math.round((sceneTiming.duration * (s.text.length || 0)) / totalChars);
    const item = { start: cursor, duration: dur, text: s.text };
    cursor += dur;
    return item;
  });
}

/** 자막 content(스타일 박힌 stringified JSON) 생성 — 기본 스타일 1종 */
function buildTextContent(text, fontPath) {
  return JSON.stringify({
    styles: [
      {
        fill: { alpha: 1.0, content: { render_type: 'solid', solid: { alpha: 1.0, color: [1.0, 1.0, 1.0] } } },
        font: { id: '', path: fontPath },
        range: [0, [...text].length],
        size: 7.0,
      },
    ],
    text,
  });
}

/**
 * draft_info.json 생성.
 * @param template 파싱된 템플릿 draft_info
 * @param scenes export 요청 scenes (asset/tts/subtitles, capcutPath= 드래프트 내 경로)
 * @param canvas {width,height}
 */
function buildDraftInfo(template, scenes, canvas, fontPath) {
  const base = structuredClone(template);
  const matIndex = indexMaterials(template.materials);

  const photoProtoSeg = findPhotoProtoSeg(template.tracks, matIndex);
  const videoClipProtoSeg = findVideoClipProtoSeg(template.tracks, matIndex);
  const textProtoSeg = findTrack(template.tracks, 'text').segments[0];
  const audioProtoSeg = findTrack(template.tracks, 'audio').segments[0];

  // 관리 대상 풀/트랙 초기화
  const pools = {
    videos: [], audios: [], texts: [],
    speeds: [], canvases: [], placeholder_infos: [], material_animations: [],
    sound_channel_mappings: [], material_colors: [], vocal_separations: [], beats: [],
  };
  const pushScaffold = (scaffold) => {
    for (const { category, item } of scaffold) {
      if (!pools[category]) pools[category] = [];
      pools[category].push(item);
    }
  };

  const videoSegs = [];
  const textSegs = [];
  const audioSegs = [];

  const { timing, total } = computeTiming(scenes);

  scenes.forEach((scene, i) => {
    const t = timing[i];

    // --- 비주얼(photo/gif/video) ---
    if (scene.asset) {
      const isVideo = scene.asset.sourceType === 'video' && videoClipProtoSeg;
      const proto = isVideo ? videoClipProtoSeg : photoProtoSeg;
      const { segment, mainMaterial, scaffold } = cloneBundle(proto, matIndex);
      mainMaterial.path = scene.asset.capcutPath;
      mainMaterial.material_name = scene.asset.fileName;
      mainMaterial.width = scene.asset.width;
      mainMaterial.height = scene.asset.height;
      segment.target_timerange = { start: t.start, duration: t.duration };

      if (isVideo) {
        mainMaterial.type = 'video';
        mainMaterial.duration = scene.asset.duration; // 원본 전체 길이
        // 음성은 TTS 담당 → 동영상 무음
        segment.volume = 0.0;
        segment.last_nonzero_volume = 0.0;
        // 장면 길이만큼 앞부분 트림 (원본보다 길면 원본까지)
        const srcDur = Math.min(scene.asset.duration || t.duration, t.duration);
        segment.source_timerange = { start: 0, duration: srcDur };
      } else {
        mainMaterial.type = scene.asset.sourceType === 'gif' ? 'gif' : 'photo';
        mainMaterial.duration = t.duration;
        segment.source_timerange = { start: 0, duration: t.duration };
      }

      pools.videos.push(mainMaterial);
      pushScaffold(scaffold);
      videoSegs.push(segment);
    }

    // --- 오디오(tts) ---
    if (scene.tts) {
      const { segment, mainMaterial, scaffold } = cloneBundle(audioProtoSeg, matIndex);
      mainMaterial.type = 'extract_music';
      mainMaterial.path = scene.tts.capcutPath;
      mainMaterial.name = scene.tts.fileName;
      mainMaterial.duration = t.duration;
      segment.target_timerange = { start: t.start, duration: t.duration };
      segment.source_timerange = { start: 0, duration: t.duration };
      pools.audios.push(mainMaterial);
      pushScaffold(scaffold);
      audioSegs.push(segment);
    }

    // --- 자막(글자수 비례) ---
    for (const sub of distributeSubtitles(scene, t)) {
      const { segment, mainMaterial, scaffold } = cloneBundle(textProtoSeg, matIndex);
      mainMaterial.type = 'subtitle';
      mainMaterial.recognize_text = sub.text;
      mainMaterial.content = buildTextContent(sub.text, fontPath);
      mainMaterial.base_content = mainMaterial.content;
      mainMaterial.font_path = fontPath; // 템플릿의 절대 폰트 경로 덮어쓰기
      delete mainMaterial.words; // 단어별 카라오케 타이밍 생략
      segment.target_timerange = { start: sub.start, duration: sub.duration };
      segment.source_timerange = null;
      pools.texts.push(mainMaterial);
      pushScaffold(scaffold);
      textSegs.push(segment);
    }
  });

  // 머티리얼 풀 주입
  for (const [cat, arr] of Object.entries(pools)) {
    base.materials[cat] = arr;
  }

  // 트랙 재구성 (video / text / audio 각 1개)
  const videoTrack = { ...structuredClone(findTrack(template.tracks, 'video')), segments: videoSegs };
  const textTrack = { ...structuredClone(findTrack(template.tracks, 'text')), segments: textSegs };
  const audioTrack = { ...structuredClone(findTrack(template.tracks, 'audio')), segments: audioSegs };
  videoTrack.id = uuid();
  textTrack.id = uuid();
  audioTrack.id = uuid();
  base.tracks = [videoTrack, textTrack, audioTrack];

  // 메타
  base.id = uuid();
  base.duration = total;
  base.canvas_config = { ...base.canvas_config, ratio: 'original', width: canvas.width, height: canvas.height };

  return base;
}

/**
 * draft_meta_info.json 생성 — 미디어 등록부. (capcut_export_spec §6)
 */
function buildDraftMeta(template, scenes, draftName, draftFoldPath, draftRoot) {
  const base = structuredClone(template);
  const value = [];

  const { timing } = computeTiming(scenes);
  scenes.forEach((scene, i) => {
    const t = timing[i];
    if (scene.asset) {
      const st = scene.asset.sourceType;
      const metetype = st === 'gif' ? 'gif' : st === 'video' ? 'video' : 'photo';
      const dur = st === 'video' ? scene.asset.duration : t.duration;
      value.push({
        ai_group_type: '', create_time: 0, import_time: 0, import_time_ms: 0,
        item_source: 1, md5: '', type: 0,
        id: uuid(),
        metetype,
        extra_info: scene.asset.fileName,
        file_Path: scene.asset.capcutPath,
        duration: dur,
        width: scene.asset.width,
        height: scene.asset.height,
        roughcut_time_range: { start: 0, duration: dur },
        sub_time_range: { start: -1, duration: -1 },
      });
    }
    if (scene.tts) {
      value.push({
        ai_group_type: '', create_time: 0, import_time: 0, import_time_ms: 0,
        item_source: 1, md5: '', type: 0,
        id: uuid(),
        metetype: 'music',
        extra_info: scene.tts.fileName,
        file_Path: scene.tts.capcutPath,
        duration: t.duration,
        width: 0, height: 0,
        roughcut_time_range: { start: 0, duration: t.duration },
        sub_time_range: { start: -1, duration: -1 },
      });
    }
  });

  // draft_materials[0] (type 0) 교체, 나머지 그룹 유지
  base.draft_materials = (base.draft_materials || []).map((g) =>
    g.type === 0 ? { ...g, value } : { ...g, value: [] },
  );
  base.draft_id = uuid().toUpperCase();
  base.draft_name = draftName;
  base.draft_fold_path = draftFoldPath;
  base.draft_root_path = draftRoot; // 템플릿의 내 경로 → env 기준으로 덮어쓰기
  return base;
}

module.exports = { buildDraftInfo, buildDraftMeta, computeTiming, distributeSubtitles, SEC };
