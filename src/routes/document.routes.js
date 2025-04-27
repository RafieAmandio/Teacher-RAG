const express = require('express');
const { uploadDocument, getDocumentsByAgent, deleteDocument } = require('../controllers/document.controller');
const { verifyToken, isTeacher } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

// All routes are protected
router.use(verifyToken);

// Routes accessible to all authenticated users
router.get('/agent/:agentId', getDocumentsByAgent);

// Routes accessible only to teachers
router.post('/', isTeacher, upload.single('file'), uploadDocument);
router.delete('/:id', isTeacher, deleteDocument);

module.exports = router;
