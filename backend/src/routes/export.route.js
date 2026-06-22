const router = require('express').Router();
const c = require('../controllers/export.controller');

router.post('/export', c.build);

module.exports = router;
