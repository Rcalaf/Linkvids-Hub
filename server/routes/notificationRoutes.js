// server/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT'); // Ensure you have this
const controller = require('../controllers/notificationController');

router.use(verifyJWT);

router.get('/', controller.getMyNotifications);
router.put('/:id/read', controller.markAsRead);
router.put('/mark-all-read', controller.markAllAsRead);
router.delete('/:id', controller.deleteNotification);

module.exports = router;