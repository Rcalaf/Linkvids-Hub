// server/routes/jobRoutes.js
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const verifyJWT = require('../middleware/verifyJWT');
const verifyPermissions = require('../middleware/verifyPermissions');
const verifyRoles = require('../middleware/verifyRoles');

// Protect all job routes
router.use(verifyJWT);
router.use(verifyRoles('LinkVidsAdmin','Collaborator'));

// Routes
router.route('/')
    .get(jobController.getAllJobs)
    .post(verifyPermissions('jobs', 'edit'),jobController.createJob);

router.get('/stats', jobController.getCollaboratorStats);

router.route('/:jobId')
    .get(jobController.getJobById)
    .put(verifyPermissions('jobs', 'edit'), jobController.updateJob)
    .delete(verifyPermissions('jobs', 'edit'), jobController.deleteJob);

router.post('/:jobId/apply', jobController.toggleApplication);
router.get('/:jobId/applicants',verifyPermissions('jobs', 'view'), jobController.getJobApplicants);
router.post('/:jobId/assign',verifyPermissions('jobs', 'edit'), jobController.assignJob);
router.post('/:jobId/reject',verifyPermissions('jobs', 'edit'), jobController.rejectApplicant);
router.post('/:jobId/unassign',verifyPermissions('jobs', 'edit'), jobController.unassignJob);
router.post('/:jobId/unreject',verifyPermissions('jobs', 'edit'), jobController.unrejectApplicant);


module.exports = router;