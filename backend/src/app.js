/** Express 앱 — 라우트 + 케이스 변환 경계. (backend_spec §1·3) */
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { toSnakeCaseDeep, toCamelCaseDeep } = require('./serializers/case');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 저장된 에셋/TTS 파일 정적 서빙: localPath `assets/..` → `/files/assets/..`
app.use('/files', express.static(config.workspaceDir));

// 요청 경계: wire(snake) → 내부(camel)
app.use((req, _res, next) => {
  if (req.body) req.body = toCamelCaseDeep(req.body);
  next();
});

// 응답 경계: 내부(camel) → wire(snake). res.json 한 곳에서만 변환.
app.use((_req, res, next) => {
  const original = res.json.bind(res);
  res.json = (body) => original(toSnakeCaseDeep(body));
  next();
});

// 라우트 (/api)
app.use('/api', require('./routes/scenes.route'));
app.use('/api', require('./routes/search.route'));
app.use('/api', require('./routes/assets.route'));
app.use('/api', require('./routes/tts.route'));
app.use('/api', require('./routes/export.route'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// 에러 핸들러 (MVP 최소)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

module.exports = app;
