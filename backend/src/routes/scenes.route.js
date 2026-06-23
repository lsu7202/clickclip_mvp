const router = require('express').Router();
const c = require('../controllers/scene.controller');

// api_contract의 /scenes:split 은 express 호환 위해 /scenes/split 로 실현
router.post('/scenes/split', c.split);
router.post('/scenes/keywords', c.keywords);
router.post('/scenes/translate', c.translate);
router.post('/scenes/image-prompts', c.imagePrompts);

module.exports = router;
