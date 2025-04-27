const express = require('express');
const { getAllUsers, getUserById, updateUser, searchUsers } = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verifyToken);
// All routes are protected

router.get('/', getAllUsers);
router.get('/search', searchUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);

module.exports = router;
