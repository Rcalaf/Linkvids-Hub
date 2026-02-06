// server/routes/jobRoutes.js
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobControllers');
const verifyJWT = require('../middleware/verifyJWT');
const verifyPermissions = require('../middleware/verifyPermissions');
const verifyRoles = require('../middleware/verifyRoles');

// Protect all job routes
router.use(verifyJWT);
//router.use(verifyRoles('LinkVidsAdmin','Collaborator'));

// Routes
router.route('/')
    .get(jobController.getAllJobs)
    .post(verifyPermissions('jobs', 'edit'),jobController.createJob);

router.get('/stats', jobController.getCollaboratorStats);
router.route('/:jobId')
    .get(jobController.getJobById)
    .put(verifyPermissions('jobs', 'edit'), jobController.updateJob)
    .delete(verifyPermissions('jobs', 'edit'), jobController.deleteJob);

router.put('/:jobId/apply', jobController.toggleApplication);
router.get('/:jobId/applicants',verifyPermissions('jobs', 'view'), jobController.getJobApplicants);
router.put('/:jobId/assign',verifyPermissions('jobs', 'edit'), jobController.assignJob);
router.put('/:jobId/reject',verifyPermissions('jobs', 'edit'), jobController.rejectApplicant);
router.put('/:jobId/unassign',verifyPermissions('jobs', 'edit'), jobController.unassignJob);
router.put('/:jobId/unreject',verifyPermissions('jobs', 'edit'), jobController.unrejectApplicant);
router.put('/:jobId/shortlist',verifyPermissions('jobs', 'edit'), jobController.shortlistApplicant);
router.put('/:jobId/unshortlist',verifyPermissions('jobs', 'edit'), jobController.undoShortlistApplicant);


module.exports = router;