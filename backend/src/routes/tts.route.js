const router = require('express').Router();
const c = require('../controllers/tts.controller');

router.post('/tts', c.generate);

module.exports = router;
