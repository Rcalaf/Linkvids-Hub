// server/routes/dataRoutes.js
const express = require('express');
const router = express.Router();
const globalDataController = require('../controllers/globalDataController');

// Route for accessing all static data lists
router.get('/static-lists', globalDataController.getStaticLists);

module.exports = router;