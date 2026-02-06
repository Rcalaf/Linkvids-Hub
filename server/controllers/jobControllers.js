const BaseUser = require('../models/BaseUser');
const Notification = require('../models/Notification');
const Job = require('../models/Job');
const mongoose = require('mongoose');


// --- CREATE Job ---
exports.createJob = async (req, res) => {
    try {
        const { 
            projectName, projectDescription, deliverables, 
            projectStartDate, projectEndDate, shootingDates,
            projectLanguage, targetRole, rate, imageRightsDuration 
        } = req.body;

        // Basic validation
        if (!projectName || !targetRole || !rate) {
            return res.status(400).json({ message: 'Missing required fields (Name, Role, Rate).' });
        }

        const newJob = await Job.create({
            projectName,
            projectDescription,
            deliverables,
            projectStartDate,
            projectEndDate,
            shootingDates,
            projectLanguage,
            targetRole,
            rate,
            imageRightsDuration,
            status: 'Open', // Default to Open for now, or 'Draft'
            createdBy: req.user // Assumes verifyJWT adds 'user' (ID) to req
        });

        // const relevantUsers = await BaseUser.find({
        //     $or: [
        //         { collaboratorType: targetRole },
        //         { agencyType: targetRole }
        //     ],
        //     userType: { $in: ['Collaborator', 'Agency'] } // Ensure they are not Admins
        // }).select('_id'); // We only need their IDs

        // if (relevantUsers.length > 0) {
        //     // B. Prepare the notification objects
        //     const notifications = relevantUsers.map(user => ({
        //         recipient: user._id,
        //         type: 'SYSTEM', // or create a new type like 'JOB_ALERT'
        //         message: `New Opportunity: A new project "${projectName}" matching your profile (${targetRole}) has just been posted. Check it out now!`,
        //         relatedJob: savedJob._id,
        //         isRead: false
        //     }));

        //     // C. Bulk Insert (Efficient)
        //     await Notification.insertMany(notifications);
            
        //     console.log(`✅ Sent ${notifications.length} notifications for new job.`);
        // }

        res.status(201).json({ message: 'Job created successfully', job: newJob });
    } catch (error) {
        console.error("Create Job Error:", error);
        res.status(500).json({ message: 'Failed to create job', error: error.message });
    }
};



// --- FIND Jobs ---
exports.getAllJobs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const currentUserId = req.user; 

        const { search, status, targetRole } = req.query;
        let query = {};

        // ---------------------------------------------------------
        // 1. BUILD QUERY (Same as before)
        // ---------------------------------------------------------
        if (req.userType === 'LinkVidsAdmin') {
             // Admin Logic: Flexible filtering
             if (status && status !== 'all') query.status = status;
             if (targetRole && targetRole !== 'all') query.targetRole = targetRole;
        } else {
            // Collaborator Logic: Restricted filtering
            if (status === 'Applied') {
                query.applicants = currentUserId; 
            } else if (status === 'Assigned' || status === 'Completed') {
                query.status = status;
                query.assignedTo = currentUserId; 
            } else {
                query.status = 'Open'; 
            }
            if (targetRole && targetRole !== 'all') {
                query.targetRole = targetRole;
            }
        }

        if (search) {
            query.$or = [
                { projectName: { $regex: search, $options: 'i' } },
                { projectDescription: { $regex: search, $options: 'i' } }
            ];
        }

        // ---------------------------------------------------------
        // 2. FETCH DATA
        // ---------------------------------------------------------
        const total = await Job.countDocuments(query);

        let jobs = await Job.find(query)
            .sort({ projectStartDate: 1 })
            .skip(skip)
            .limit(limit)
            .populate('createdBy', 'name email')
            .lean(); // Convert to plain JS objects

        // ---------------------------------------------------------
        // 3. 🚨 CONDITIONAL DATA CLEANUP 🚨
        // ---------------------------------------------------------
        
        jobs = jobs.map(job => {
            // A. Calculate Context Flags (Useful for everyone)
            const hasApplied = job.applicants && job.applicants.some(id => id.toString() === currentUserId);
            const isRejected = job.rejectedApplicants && job.rejectedApplicants.some(id => id.toString() === currentUserId);
            const isSelected = job.assignedTo && job.assignedTo.toString() === currentUserId;
            
            // Calculate Applicant Count (Useful for Admin List)
            const applicantCount = job.applicants ? job.applicants.length : 0;

            // B. Prepare base object
            const jobData = { 
                ...job, 
                hasApplied,
                isRejected,
                isSelected,
                applicantCount 
            };

            if (req.userType !== 'LinkVidsAdmin') {
                // Privacy: Collaborators should NOT see the list of other user IDs
                delete jobData.applicants;
                delete jobData.rejectedApplicants;
            } 
            // Else: Admins KEEP the arrays so your ApplicantManager (if it uses this list) works.
            // NOTE: Your ApplicantManager actually uses a separate endpoint (getJobApplicants)
            // so deleting these here for Admin wouldn't break the Detail View, 
            // BUT deleting them prevents the "Applicant Count" column logic if we aren't careful.
            
            return jobData;
        });

        res.json({
            data: jobs,
            metadata: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });

    } catch (error) {
        console.error("Fetch Jobs Error:", error);
        res.status(500).json({ message: 'Failed to fetch jobs' });
    }
};

// --- READ ONE Job ---
exports.getJobById = async (req, res) => {
    try {
        const { jobId } = req.params;
        // Ensure ID is a string for comparison
        const currentUserId = req.user.toString(); 

        const jobDoc = await Job.findById(jobId)
            .populate('createdBy', 'username email companyName profile_picture')
            .populate('assignedTo', 'username email');
        
        if (!jobDoc) return res.status(404).json({ message: 'Job not found' });

        // Convert Mongoose document to a plain JavaScript object so we can modify it
        const job = jobDoc.toObject();

        if (req.userType !== 'LinkVidsAdmin') {
            // COLLABORATOR VIEW: Calculate flags + Hide private arrays
            
            // 1. Find the specific application object for this user
            const userApp = job.applicants 
                ? job.applicants.find(app => app.user.toString() === currentUserId) 
                : null;

            // 2. Calculate Status Flags
            job.hasApplied = !!userApp; // True if object exists
            
            // Rejection is now a status, not a separate list
            job.isRejected = userApp ? userApp.status === 'rejected' : false;
            
            job.isSelected = job.assignedTo && job.assignedTo._id.toString() === currentUserId;

            // Optional: You might want to pass the specific status back (e.g. 'shortlisted')
            job.myApplicationStatus = userApp ? userApp.status : null;

            // 3. Privacy Cleanup
            // Collaborators should not see the full list of other applicants
            delete job.applicants;
        }
        
        // Note: For Admins, we keep 'applicants' intact so they can see the list
        
        res.json(job);
    } catch (error) {
        console.error("Get Job Detail Error:", error);
        res.status(500).json({ message: 'Error fetching job details' });
    }
};

// --- UPDATE Job ---
exports.updateJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        
        // 1. Create a copy of the body to sanitize it
        const updates = { ...req.body };

        // 🚨 CRITICAL: Remove fields that must NOT be updated via this generic endpoint
        // With the new logic, overwriting 'applicants' would destroy dates/statuses/cover notes.
        delete updates.applicants; 
        delete updates.createdBy;  // Ownership shouldn't change here
        delete updates._id;
        
        // Note: We typically allow updating 'assignedTo' or 'status' here in case 
        // the admin needs to manually fix a mistake, but usually those are handled 
        // by specific flow actions too. If you want to be strict, delete those too.

        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            { $set: updates }, // explicit $set ensures we merge, not replace
            { new: true, runValidators: true }
        );

        if (!updatedJob) return res.status(404).json({ message: 'Job not found' });

        res.json({ message: 'Job updated', job: updatedJob });
    } catch (error) {
        console.error("Update Job Error:", error);
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

// // --- DELETE Job ---
// exports.deleteJob = async (req, res) => {
//     try {
//         const { jobId } = req.params;
//         const deleted = await Job.findByIdAndDelete(jobId);

//         if (!deleted) return res.status(404).json({ message: 'Job not found' });

//         res.json({ message: 'Job deleted successfully' });
//     } catch (error) {
//         res.status(500).json({ message: 'Delete failed' });
//     }
// };

exports.deleteJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        // 1. Delete and Fetch in one step
        // We get the deleted document back so we can notify the people who applied
        const job = await Job.findByIdAndDelete(jobId);

        if (!job) return res.status(404).json({ message: 'Job not found' });

        // 2. Notify Applicants (Background Operation)
        // Even though the job is gone, we have the 'job' object in memory
        if (job.applicants && job.applicants.length > 0) {
            
            // NEW SCHEMA: Map 'app.user' to get the IDs
            const applicantIds = job.applicants.map(app => app.user);

            const notifications = applicantIds.map(userId => ({
                recipient: userId,
                type: 'SYSTEM',
                message: `The job "${job.projectName}" you applied for has been closed/removed.`,
                relatedJob: null, // Link is null because job no longer exists
                isRead: false
            }));

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }
        }

        res.json({ message: 'Job deleted successfully' });

    } catch (error) {
        console.error("Delete Job Error:", error);
        res.status(500).json({ message: 'Delete failed' });
    }
};

// --- COLLABORATOR TOGGLE APPLICAION Job ---
// @desc    Apply or Withdraw Application
// @route   POST /api/jobs/:jobId/toggle-application
exports.toggleApplication = async (req, res) => {
    console.log("calling toggle...")
    try {
        const { jobId } = req.params;
        
        // Ensure we handle both string ID or Object ID from middleware
        const userId = req.user._id ? req.user._id.toString() : req.user.toString();

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // ---------------------------------------------------------
        // 1. CHECK IF USER APPLIED (NEW SCHEMA LOGIC)
        // We look for the subdocument where .user matches the ID
        // ---------------------------------------------------------
        const existingAppIndex = job.applicants.findIndex(
            app => app.user.toString() === userId
        );

        if (existingAppIndex !== -1) {
            // ===========================
            // SCENARIO A: WITHDRAW
            // ===========================
            
            // Remove the subdocument at the found index
            job.applicants.splice(existingAppIndex, 1);
            await job.save();
            
            return res.json({ message: 'Application withdrawn', hasApplied: false });

        } else {
            // ===========================
            // SCENARIO B: APPLY
            // ===========================
            
            if (job.status !== 'Open') {
                return res.status(400).json({ message: 'This job is not accepting applications' });
            }

            // PUSH NEW SUBDOCUMENT STRUCTURE
            job.applicants.push({
                user: userId,
                status: 'pending',     // Initial status
                appliedAt: new Date()  // Capture timestamp
            });

            await job.save();

            // --- NOTIFICATION LOGIC (Preserved from your code) ---
            
            // 1. Get Applicant Name
            // specific fields might differ (name vs username), adjust as needed
            const applicant = await BaseUser.findById(userId).select('username name'); 
            const applicantName = applicant ? (applicant.username || applicant.name) : 'A user';

            // 2. Find Admins
            const admins = await BaseUser.find({ userType: 'LinkVidsAdmin' }).select('_id');

            if (admins.length > 0) {
                // 3. Create Notification Objects
                const adminNotifications = admins.map(admin => ({
                    recipient: admin._id,
                    type: 'SYSTEM',
                    message: `New Application: ${applicantName} has applied for "${job.projectName}".`,
                    relatedJob: job._id,
                    isRead: false
                }));

                // 4. Bulk Insert
                await Notification.insertMany(adminNotifications);
            }

            return res.json({ message: 'Application submitted successfully', hasApplied: true });
        }

    } catch (error) {
        console.error("Application Toggle Error:", error);
        res.status(500).json({ message: 'Failed to process application' });
    }
};

// --- COLLABORATOR APPLICAION Job STATE ---
exports.getCollaboratorStats = async (req, res) => {
    try {
        const userId = req.user; // String from JWT
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // We need the ID as an ObjectId for aggregation matching

        const activeApplications = await Job.countDocuments({
            applicants: userObjectId, 
            status: 'Open'
        });

        const completedStats = await Job.aggregate([
            {
                $match: {
                    assignedTo: userObjectId,
                    status: 'Completed'
                }
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },         // Count jobs
                    totalEarnings: { $sum: "$rate" } // Sum 'rate' field
                }
            }
        ]);

        const stats = {
            activeApplications,
            jobsCompleted: completedStats[0]?.count || 0,
            totalEarnings: completedStats[0]?.totalEarnings || 0
        };
        // console.log("3. Sending Stats:", stats);
        // console.log("-------------------");

        res.json(stats);

    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ message: 'Failed to calculate stats' });
    }
};

// @desc    Get ALL applications across ALL jobs (Admin View)
// @route   GET /api/jobs/applications/all
exports.getAllApplications = async (req, res) => {
    try {
        // 1. Fetch all jobs that have applicants
        // We select only the fields we need to keep the query light
        const jobs = await Job.find({ 'applicants.0': { $exists: true } })
            .select('projectName status applicants') 
            .populate({
                path: 'applicants.user',
                select: 'name email profile_picture city country' // Fetch candidate details
            })
            .sort({ createdAt: -1 });

        // 2. Flatten the data
        // Currently, we have an array of Jobs, each containing an array of Applicants.
        // We want a single flat array of "Applications".
        const allApplications = [];

        jobs.forEach(job => {
            job.applicants.forEach(app => {
                // Safety check: Ensure the user still exists (hasn't been deleted from DB)
                if (app.user) {
                    allApplications.push({
                        // Job Metadata
                        jobId: job._id,
                        jobTitle: job.projectName,
                        jobStatus: job.status,

                        // Application Metadata
                        applicationId: app._id,
                        status: app.status, // 'pending', 'shortlisted', 'accepted', 'rejected'
                        appliedAt: app.appliedAt,
                        coverNote: app.coverNote,

                        // Candidate Metadata
                        candidateId: app.user._id,
                        candidateName: app.user.name,
                        candidateEmail: app.user.email,
                        candidateAvatar: app.user.profile_picture,
                        candidateLocation: app.user.city ? `${app.user.city}, ${app.user.country}` : 'Unknown'
                    });
                }
            });
        });

        // 3. Sort by most recent application date
        allApplications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

        res.json(allApplications);

    } catch (error) {
        console.error("Fetch All Applications Error:", error);
        res.status(500).json({ message: 'Failed to fetch applications' });
    }
};

exports.getJobApplicants = async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const job = await Job.findById(jobId)
            .populate({
                path: 'applicants.user', // <--- CHANGED: Look inside the subdocument
                select: 'name username email profile_picture collaboratorType city country' 
            });

        if (!job) return res.status(404).json({ message: 'Job not found' });

        // 1. Filter & Map
        // We map the data to a clean structure so the frontend gets a flat object
        // containing both User Info AND Application Info (Status, Date).
        const applicantsList = job.applicants
            .filter(app => app.user) // Safety: Remove applications where the User was deleted
            .map(app => ({
                // Application Metadata
                _id: app._id,           // The Application ID (unique to this specific application)
                status: app.status,     // 'pending', 'rejected', etc.
                appliedAt: app.appliedAt,
                coverNote: app.coverNote,

                // User Data (Flattened for easier access)
                userId: app.user._id,
                name: app.user.name,
                username: app.user.username,
                email: app.user.email,
                profile_picture: app.user.profile_picture,
                collaboratorType: app.user.collaboratorType,
                city: app.user.city,
                country: app.user.country
            }));

            console.log(applicantsList)

        res.json(applicantsList);

    } catch (error) {
        console.error("Fetch Applicants Error:", error);
        res.status(500).json({ message: 'Failed to fetch applicants' });
    }
};

// --- ASSIGN JOB TO USER ---
// @desc    Assign Job to User (Notify Winner & Losers)
// @route   PUT /api/jobs/:jobId/assign
exports.assignJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body; // The ID of the user being assigned

        console.log(userId)

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // 1. VALIDATE: Ensure the user actually applied
        // We look for the subdocument in the array
        const winnerApp = job.applicants.find(
            app => {
                if (!app.user) return false;
                return app.user.toString() === userId.toString();
            }
        );

        console.log(winnerApp)

        if (!winnerApp) {
            return res.status(400).json({ message: 'User has not applied to this job.' });
        }

        // 2. UPDATE JOB STATUS
        job.assignedTo = userId;
        job.status = 'Assigned';

        // 3. UPDATE APPLICANT STATUSES (Winner vs. Losers)
        const rejectedIds = []; // We collect these to send notifications later

        job.applicants.forEach(app => {
            if (app.user.toString() === userId) {
                // The Winner
                app.status = 'shortlisted'; // or 'accepted' - marks them as the chosen one
            } else {
                // The Losers
                // Only mark them rejected if they aren't already (prevent double notifications if re-running)
                if (app.status !== 'rejected') {
                    app.status = 'rejected';
                    rejectedIds.push(app.user.toString());
                }
            }
        });
        
        // Save all changes (Job status + Applicant statuses)
        await job.save();

        // 4. NOTIFICATIONS
        const notifications = [];

        // A. Notify the Winner
        notifications.push({
            recipient: userId,
            type: 'JOB_ASSIGNED',
            message: `Congratulations! You have been selected for the project: "${job.projectName}". Check your dashboard for details.`,
            relatedJob: job._id,
            isRead: false
        });

        // B. Notify the Losers
        rejectedIds.forEach(loserId => {
            notifications.push({
                recipient: loserId,
                type: 'JOB_REJECTED',
                message: `Update on "${job.projectName}": The position has been filled by another candidate. Thank you for your interest!`,
                relatedJob: job._id,
                isRead: false
            });
        });

        // C. Send All in Parallel
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.json({ message: 'Job assigned successfully', job });

    } catch (error) {
        console.error("Assign Job Error:", error);
        res.status(500).json({ message: 'Failed to assign job' });
    }
};

exports.rejectApplicant = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // 1. FIND APPLICANT SUBDOCUMENT (New Logic)
        // We look for the object inside the array where .user matches the ID
        const app = job.applicants.find(a => 
            a.user && a.user.toString() === userId.toString()
        );

        if (!app) {
            return res.status(400).json({ message: 'User is not an applicant' });
        }

        // 2. UPDATE STATUS (Instead of moving to a separate array)
        app.status = 'rejected';

        // 3. SAFETY: IF THEY WERE ASSIGNED, UNASSIGN THEM
        // If the admin decides to reject the person they previously hired
        if (job.assignedTo && job.assignedTo.toString() === userId.toString()) {
            job.assignedTo = null;
            job.status = 'Open'; // Re-open the job
        }

        await job.save();

        // 4. NOTIFICATION
        await Notification.create({
            recipient: userId,
            type: 'JOB_REJECTED',
            message: `Update on your application for "${job.projectName}". Unfortunately, we have decided to proceed with other candidates at this time.`,
            relatedJob: job._id
        });

        res.json({ message: 'Applicant rejected', applicantId: userId });

    } catch (error) {
        console.error("Reject Error:", error);
        res.status(500).json({ message: 'Failed to reject applicant' });
    }
};

exports.unassignJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        if (job.status !== 'Assigned') {
            return res.status(400).json({ message: 'Job is not currently assigned.' });
        }

        const previousAssignedId = job.assignedTo;

        // 1. Reset Job Level Fields
        job.assignedTo = null;
        job.status = 'Open'; 

        // 2. Reset Applicant Statuses (The "Second Chance" Logic)
        const restoredApplicantIds = [];

        job.applicants.forEach(app => {
            if (!app.user) return; // Safety check

            const userIdStr = app.user.toString();

            // A. Reset the Previous Winner
            if (previousAssignedId && userIdStr === previousAssignedId.toString()) {
                app.status = 'pending'; // Reset them back to pool
            }
            
            // B. Restore the "Losers" (Rejected Applicants)
            // We identify anyone marked as 'rejected' and give them a second chance
            if (app.status === 'rejected') {
                app.status = 'pending';
                restoredApplicantIds.push(userIdStr);
            }
            
            // Note: 'shortlisted' or 'pending' users stay as they are
        });
        
        await job.save();

        // 3. Notifications
        const notifications = [];

        // A. Notify the Previous Winner (Bad News)
        if (previousAssignedId) {
            notifications.push({
                recipient: previousAssignedId,
                type: 'SYSTEM',
                message: `Update regarding "${job.projectName}": Your assignment to this project has been cancelled. The project status has been reverted to 'Open'.`,
                relatedJob: job._id
            });
        }

        // B. Notify the Restored Applicants (Good News)
        if (restoredApplicantIds.length > 0) {
            restoredApplicantIds.forEach(userId => {
                notifications.push({
                    recipient: userId,
                    type: 'SYSTEM',
                    message: `Good News! The position for "${job.projectName}" has re-opened and your application is back under review.`,
                    relatedJob: job._id
                });
            });
        }

        // C. Send All in Parallel
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.json({ message: 'Job unassigned successfully. Status is now Open.', job });

    } catch (error) {
        console.error("Unassign Job Error:", error);
        res.status(500).json({ message: 'Failed to unassign job' });
    }
};

exports.unrejectApplicant = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // 1. FIND APPLICANT SUBDOCUMENT
        const app = job.applicants.find(a => 
            a.user && a.user.toString() === userId.toString()
        );

        if (!app) {
            return res.status(400).json({ message: 'User is not an applicant' });
        }

        // 2. RESTORE STATUS
        // We set it back to 'pending' so it appears as a normal candidate again.
        app.status = 'pending';

        await job.save();

        // 3. NOTIFICATION
        await Notification.create({
            recipient: userId,
            type: 'SYSTEM',
            message: `Good news! Your application for "${job.projectName}" has been reconsidered and is back under review.`,
            relatedJob: job._id
        });

        res.json({ message: 'Applicant restored successfully', applicantId: userId });

    } catch (error) {
        console.error("Unreject Error:", error);
        res.status(500).json({ message: 'Failed to restore applicant' });
    }
};

exports.shortlistApplicant = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const app = job.applicants.find(a => a.user && a.user.toString() === userId.toString());
        if (!app) return res.status(400).json({ message: 'User is not an applicant' });

        // Update status
        app.status = 'shortlisted';
        await job.save();

        // Optional: Notify the user? Usually shortlisting is internal, so maybe no notification.
        
        res.json({ message: 'Applicant shortlisted', applicantId: userId });

    } catch (error) {
        console.error("Shortlist Error:", error);
        res.status(500).json({ message: 'Failed to shortlist applicant' });
    }
};

// @desc    Revert Shortlist (Set back to Pending)
// @route   PUT /api/jobs/:jobId/unshortlist
exports.undoShortlistApplicant = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const app = job.applicants.find(a => a.user && a.user.toString() === userId.toString());
        if (!app) return res.status(400).json({ message: 'User is not an applicant' });

        // Revert to pending
        app.status = 'pending';
        await job.save();

        res.json({ message: 'Applicant removed from shortlist', applicantId: userId });

    } catch (error) {
        console.error("Undo Shortlist Error:", error);
        res.status(500).json({ message: 'Failed to update applicant' });
    }
};