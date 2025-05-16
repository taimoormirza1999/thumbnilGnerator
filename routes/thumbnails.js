const express = require('express');
const { generateThumbnails, getThumbnails, getThumbnailsBatch } = require('../controllers/thumbnailController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authMiddleware);

router.post('/generate', generateThumbnails);
router.get('/:titleId', getThumbnails);
router.get('/batch/:titleId', getThumbnailsBatch);


module.exports = router; 