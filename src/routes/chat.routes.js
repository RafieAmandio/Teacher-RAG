const express = require('express');
const {
  createChat,
  getUserChats,
  getChatById,
  sendMessage,
  deleteChat,
} = require('../controllers/chat.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes are protected
router.use(verifyToken);

router.post('/', createChat);
router.get('/', getUserChats);
router.get('/:id', getChatById);
router.post('/message', sendMessage);
router.delete('/:id', deleteChat);

module.exports = router;
