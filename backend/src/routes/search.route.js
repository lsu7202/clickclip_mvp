const router = require('express').Router();
const c = require('../controllers/search.controller');

router.get('/search/gifs', c.gifs);
router.get('/search/images', c.images);

module.exports = router;
