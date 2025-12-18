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
        const currentUserId = req.user;

        const jobDoc = await Job.findById(jobId).populate('createdBy', 'name email');
        
        
        if (!jobDoc) return res.status(404).json({ message: 'Job not found' });

        const job = jobDoc.toObject();

        if (req.userType !== 'LinkVidsAdmin') {
            // COLLABORATOR VIEW: Calculate flags + Hide private arrays
            console.log('populating data about job status over the user requester....')
            // A. Calculate Status Flags
            job.hasApplied = job.applicants && job.applicants.some(id => id.toString() === currentUserId);
            job.isRejected = job.rejectedApplicants && job.rejectedApplicants.some(id => id.toString() === currentUserId);
            job.isSelected = job.assignedTo && job.assignedTo.toString() === currentUserId;

            console.log(job.hasApplied)
            console.log(job.isRejected)
            console.log(job.isSelected)
            // B. Privacy Cleanup (Remove lists of other users)
            delete job.applicants;
            delete job.rejectedApplicants;
        }
        
        res.json(job);
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error fetching job details' });
    }
};

// --- UPDATE Job ---
exports.updateJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            req.body, // Pass the whole body (ensure frontend sends clean data)
            { new: true, runValidators: true }
        );

        if (!updatedJob) return res.status(404).json({ message: 'Job not found' });

        res.json({ message: 'Job updated', job: updatedJob });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

// --- DELETE Job ---
exports.deleteJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const deleted = await Job.findByIdAndDelete(jobId);

        if (!deleted) return res.status(404).json({ message: 'Job not found' });

        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed' });
    }
};

// --- COLLABORATOR TOGGLE APPLICAION Job ---
exports.toggleApplication = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user; // From verifyJWT

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Check if user is already in the list
        const isApplied = job.applicants.includes(userId);

        if (isApplied) {
            // WITHDRAW: Remove user from array
            job.applicants = job.applicants.filter(id => id.toString() !== userId);
            await job.save();
            return res.json({ message: 'Application withdrawn', hasApplied: false });
        } else {
            // APPLY: Add user to array
            job.applicants.push(userId);
            await job.save();

            // 1. Get the applicant's name (optional, for a better message)
            const applicant = await BaseUser.findById(userId).select('name');
            const applicantName = applicant ? applicant.name : 'A user';

            // 2. Find all Superadmins
            const admins = await BaseUser.find({ userType: 'LinkVidsAdmin' }).select('_id');

            if (admins.length > 0) {
                // 3. Create Notification Objects
                const adminNotifications = admins.map(admin => ({
                    recipient: admin._id,
                    type: 'SYSTEM', // Admin alerts can be 'SYSTEM' or a new 'ADMIN_ALERT' type
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

exports.getJobApplicants = async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const job = await Job.findById(jobId)
            .populate({
                path: 'applicants',
                select: 'name email profile_picture collaboratorType city country' // Only fetch necessary fields
            });

        if (!job) return res.status(404).json({ message: 'Job not found' });

        res.json(job.applicants);
    } catch (error) {
        console.error("Fetch Applicants Error:", error);
        res.status(500).json({ message: 'Failed to fetch applicants' });
    }
};

// --- ASSIGN JOB TO USER ---
exports.assignJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body; // The ID of the winner

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // 1. Validate User is an applicant
        const isApplicant = job.applicants.includes(userId);
        if (!isApplicant) {
            return res.status(400).json({ message: 'User has not applied to this job.' });
        }

        // 2. Update Job
        job.assignedTo = userId;
        job.status = 'Assigned';
        
        
        const rejectedIds = job.applicants
            .map(id => id.toString())
            .filter(id => id !== userId);
        
        // 3. Update the Rejected List in Database
        // We add the losers to the 'rejectedApplicants' array so they appear greyed out in Admin UI
        // and get the "Application Rejected" badge in their Dashboard.
        const currentRejected = new Set(job.rejectedApplicants.map(id => id.toString()));
        rejectedIds.forEach(id => currentRejected.add(id));
        job.rejectedApplicants = Array.from(currentRejected);
        
        // Note: We keep the 'applicants' array intact so we have a record of who else applied.
        // The frontend logic for other users will see:
        // IF (job.status === 'Assigned' && job.assignedTo !== MyID) THEN "Position Filled / Rejected"
        
        await job.save();

        const assignedNotification = {
            recipient: userId,
            type: 'JOB_ASSIGNED',
            message: `Congratulations! You have been selected for the project: "${job.projectName}". Check your dashboard for details.`,
            relatedJob: job._id
        };

        // B. Notify the Losers (The feature you requested)
        const rejectedNotifications = rejectedIds.map(loserId => ({
            recipient: loserId,
            type: 'JOB_REJECTED', // Using this type ensures they see the Red "X" icon
            message: `Update on "${job.projectName}": The position has been filled by another candidate. Thank you for your interest and we hope to see you apply for future roles!`,
            relatedJob: job._id
        }));

        // C. Send All in Parallel
        // We combine the winner message + the array of loser messages into one DB operation
        const allNotifications = [assignedNotification, ...rejectedNotifications];
        
        if (allNotifications.length > 0) {
            await Notification.insertMany(allNotifications);
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

        // 1. Ensure user is actually an applicant
        if (!job.applicants.includes(userId)) {
            return res.status(400).json({ message: 'User is not an applicant' });
        }

        // 2. Add to rejected list if not already there
        if (!job.rejectedApplicants.includes(userId)) {
            job.rejectedApplicants.push(userId);
        }

        // 3. Safety: If they were assigned, unassign them
        if (job.assignedTo && job.assignedTo.toString() === userId) {
            job.assignedTo = null;
            job.status = 'Open'; // Re-open the job if the winner is rejected
        }

        await job.save();

        await Notification.create({
            recipient: userId,
            type: 'JOB_REJECTED',
            message: `Update on your application for "${job.projectName}". Unfortunately, we have decided to proceed with other candidates at this time.`,
            relatedJob: job._id
        });

        res.json({ message: 'Applicant rejected', rejectedApplicants: job.rejectedApplicants });

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
        
        // 1. Identify all the "Losers" (people we auto-rejected when we assigned it)
        // We assume anyone currently in 'rejectedApplicants' should be given a second chance
        // because the job is completely reopening.
        const restoredApplicantIds = job.rejectedApplicants.map(id => id.toString());

        // Reset fields
        job.assignedTo = null;
        job.status = 'Open'; 

        // Clear the rejected list so everyone is "Pending" again
        job.rejectedApplicants = [];
        
        await job.save();
        

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

        // Remove from rejected list
        job.rejectedApplicants = job.rejectedApplicants.filter(
            id => id.toString() !== userId
        );

        await job.save();

        await Notification.create({
            recipient: userId,
            type: 'SYSTEM',
            message: `Good news! Your application for "${job.projectName}" has been reconsidered and is back under review.`,
            relatedJob: job._id
        });

        res.json({ message: 'Applicant restored successfully', rejectedApplicants: job.rejectedApplicants });

    } catch (error) {
        console.error("Unreject Error:", error);
        res.status(500).json({ message: 'Failed to restore applicant' });
    }
};