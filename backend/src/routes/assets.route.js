const router = require('express').Router();
const multer = require('multer');
const c = require('../controllers/asset.controller');

// 메모리 저장 (버퍼 → fileStore가 디스크 기록). 200MB 한도.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

router.post('/assets/download', c.download);
router.post('/assets/upload', upload.single('file'), c.upload);
router.post('/images/generate', c.generateImage);
router.post('/videos/generate', c.generateVideo);

module.exports = router;
