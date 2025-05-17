const express = require('express');
const { generateThumbnails, getThumbnails } = require('../controllers/thumbnailController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authMiddleware);

router.post('/generate', generateThumbnails);
router.get('/:titleId', getThumbnails);

module.exports = router; 