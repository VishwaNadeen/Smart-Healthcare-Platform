const express = require('express');
const router = express.Router();
const {
  sendNotification,
  getNotificationHistory,
  getAllNotifications
} = require('../controllers/notification.controller');

router.post('/send', sendNotification);
router.get('/all', getAllNotifications);
router.get('/history/:recipientId', getNotificationHistory);

module.exports = router;