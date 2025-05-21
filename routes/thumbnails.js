const express = require('express');
const { generateThumbnails, getThumbnails, regenerateThumbnail, getThumbnailById } = require('../controllers/thumbnailController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authMiddleware);

router.post('/generate', generateThumbnails);
router.post('/regenerate', regenerateThumbnail);
router.get('/:titleId', getThumbnails);
router.get('/single/:thumbnailId', getThumbnailById);
// router.post('/regenerate', (req, res) => {
//   console.log('Regenerating thumbnail:', req.body);
// //   alert('Regenerating thumbnail:'+req.body.titleId+' - '+req.body.thumbnailId);
//   res.send('Regenerating thumbnail:'+req.body.titleId+' - '+req.body.thumbnailId);
// //   regenerateThumbnail(req, res);
// });

module.exports = router; 