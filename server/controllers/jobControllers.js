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
            projectLanguage, targetRole, rate, imageRightsDuration,
            positionsAvailable // <--- New Field
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
            positionsAvailable: positionsAvailable || 1, // Default to 1
            status: 'Open', 
            createdBy: req.user,
            assignedTo: [] // Initialize empty array
        });

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

        // 1. BUILD QUERY
        if (req.userType === 'LinkVidsAdmin') {
             if (status && status !== 'all') query.status = status;
             if (targetRole && targetRole !== 'all') query.targetRole = targetRole;
        } else {
            // Collaborator Logic
            if (status === 'Applied') {
                query['applicants.user'] = currentUserId; 
            } else if (status === 'Assigned' || status === 'Completed') {
                // Mongoose handles array queries automatically:
                // This finds jobs where currentUserId is IN the assignedTo array
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

        // 2. FETCH DATA
        const total = await Job.countDocuments(query);

        let jobs = await Job.find(query)
            .sort({ projectStartDate: 1 })
            .skip(skip)
            .limit(limit)
            .populate('createdBy', 'name email')
            .lean(); 

        // 3. CONDITIONAL DATA CLEANUP
        jobs = jobs.map(job => {
            const userIdStr = currentUserId.toString();

            // A. Find the specific application object for this user
            const myApplication = job.applicants && job.applicants.find(app => {
                const appId = app.user ? app.user.toString() : app.toString();
                return appId === userIdStr;
            });

            // B. Calculate Flags
            const hasApplied = !!myApplication; 
            
            const isRejected = myApplication ? myApplication.status === 'rejected' : false;
            
            // Check specific status inside the applicant object
            const isSelected = myApplication ? (myApplication.status === 'accepted') : false;
            
            const applicantCount = job.applicants ? job.applicants.length : 0;

            const jobData = { 
                ...job, 
                hasApplied,
                isRejected,
                isSelected,
                applicantCount,
                myApplicationStatus: myApplication ? myApplication.status : null 
            };

            if (req.userType !== 'LinkVidsAdmin') {
                delete jobData.applicants;
                delete jobData.rejectedApplicants;
            } 
            
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
        const currentUserId = req.user.toString(); 

        const jobDoc = await Job.findById(jobId)
            .populate('createdBy', 'username email companyName profile_picture')
            .populate('assignedTo', 'username email'); // Populates the array of users
        
        if (!jobDoc) return res.status(404).json({ message: 'Job not found' });

        const job = jobDoc.toObject();

        if (req.userType !== 'LinkVidsAdmin') {
            const userApp = job.applicants 
                ? job.applicants.find(app => app.user && app.user.toString() === currentUserId) 
                : null;

            job.hasApplied = !!userApp; 
            job.isRejected = userApp ? userApp.status === 'rejected' : false;
            job.isSelected = userApp ? (userApp.status === 'accepted') : false;
            job.myApplicationStatus = userApp ? userApp.status : null;

            delete job.applicants;
        }
        
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
        const updates = { ...req.body };

        delete updates.applicants; 
        delete updates.createdBy; 
        delete updates._id;
        
        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!updatedJob) return res.status(404).json({ message: 'Job not found' });

        res.json({ message: 'Job updated', job: updatedJob });
    } catch (error) {
        console.error("Update Job Error:", error);
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

// --- DELETE Job ---
exports.deleteJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await Job.findByIdAndDelete(jobId);

        if (!job) return res.status(404).json({ message: 'Job not found' });

        if (job.applicants && job.applicants.length > 0) {
            const applicantIds = job.applicants.map(app => app.user);

            const notifications = applicantIds.map(userId => ({
                recipient: userId,
                type: 'SYSTEM',
                message: `The job "${job.projectName}" you applied for has been closed/removed.`,
                relatedJob: null, 
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

// --- TOGGLE APPLICATION ---
exports.toggleApplication = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user._id ? req.user._id.toString() : req.user.toString();

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const existingAppIndex = job.applicants.findIndex(
            app => app.user.toString() === userId
        );

        if (existingAppIndex !== -1) {
            // WITHDRAW
            job.applicants.splice(existingAppIndex, 1);
            await job.save();
            return res.json({ message: 'Application withdrawn', hasApplied: false });
        } else {
            // APPLY
            if (job.status !== 'Open') {
                return res.status(400).json({ message: 'This job is not accepting applications' });
            }

            job.applicants.push({
                user: userId,
                status: 'pending',     
                appliedAt: new Date()  
            });

            await job.save();

            // Notify Admin
            const applicant = await BaseUser.findById(userId).select('username name'); 
            const applicantName = applicant ? (applicant.username || applicant.name) : 'A user';
            const admins = await BaseUser.find({ userType: 'LinkVidsAdmin' }).select('_id');

            if (admins.length > 0) {
                const adminNotifications = admins.map(admin => ({
                    recipient: admin._id,
                    type: 'SYSTEM',
                    message: `New Application: ${applicantName} has applied for "${job.projectName}".`,
                    relatedJob: job._id,
                    isRead: false
                }));
                await Notification.insertMany(adminNotifications);
            }

            return res.json({ message: 'Application submitted successfully', hasApplied: true });
        }

    } catch (error) {
        console.error("Application Toggle Error:", error);
        res.status(500).json({ message: 'Failed to process application' });
    }
};

// --- GET COLLABORATOR STATS ---
exports.getCollaboratorStats = async (req, res) => {
    try {
        const userId = req.user; 
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const activeApplications = await Job.countDocuments({
            applicants: userObjectId, 
            status: 'Open'
        });

        const completedStats = await Job.aggregate([
            {
                $match: {
                    // Check if user is in applicants with accepted status AND job is completed
                    'applicants': { $elemMatch: { user: userObjectId, status: 'accepted' } },
                    status: 'Completed'
                }
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },         
                    totalEarnings: { $sum: "$rate" } 
                }
            }
        ]);

        const stats = {
            activeApplications,
            jobsCompleted: completedStats[0]?.count || 0,
            totalEarnings: completedStats[0]?.totalEarnings || 0
        };

        res.json(stats);

    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ message: 'Failed to calculate stats' });
    }
};

// --- GET ALL APPLICATIONS (ADMIN) ---
exports.getAllApplications = async (req, res) => {
    try {
        const jobs = await Job.find({ 'applicants.0': { $exists: true } })
            .select('projectName status applicants') 
            .populate({
                path: 'applicants.user',
                select: 'name email profile_picture city country' 
            })
            .sort({ createdAt: -1 });

        const allApplications = [];

        jobs.forEach(job => {
            job.applicants.forEach(app => {
                if (app.user) {
                    allApplications.push({
                        jobId: job._id,
                        jobTitle: job.projectName,
                        jobStatus: job.status,
                        applicationId: app._id,
                        status: app.status, 
                        appliedAt: app.appliedAt,
                        coverNote: app.coverNote,
                        rating: app.rating,
                        ratingNote: app.ratingNote,
                        candidateId: app.user._id,
                        candidateName: app.user.name,
                        candidateEmail: app.user.email,
                        candidateAvatar: app.user.profile_picture,
                        candidateLocation: app.user.city ? `${app.user.city}, ${app.user.country}` : 'Unknown'
                    });
                }
            });
        });

        allApplications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        res.json(allApplications);

    } catch (error) {
        console.error("Fetch All Applications Error:", error);
        res.status(500).json({ message: 'Failed to fetch applications' });
    }
};

// --- GET APPLICANTS FOR A JOB ---
exports.getJobApplicants = async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const job = await Job.findById(jobId)
            .populate({
                path: 'applicants.user', 
                select: 'name username email profile_picture collaboratorType city country' 
            });

        if (!job) return res.status(404).json({ message: 'Job not found' });

        const applicantsList = job.applicants
            .filter(app => app.user) 
            .map(app => ({
                _id: app._id,           
                status: app.status,     
                appliedAt: app.appliedAt,
                coverNote: app.coverNote,
                rating: app.rating,
                ratingNote: app.ratingNote,
                userId: app.user._id,
                name: app.user.name,
                username: app.user.username,
                email: app.user.email,
                profile_picture: app.user.profile_picture,  
                collaboratorType: app.user.collaboratorType,
                city: app.user.city,
                country: app.user.country
            }));

        res.json(applicantsList);

    } catch (error) {
        console.error("Fetch Applicants Error:", error);
        res.status(500).json({ message: 'Failed to fetch applicants' });
    }
};

// --- ASSIGN JOB TO USER (MULTI-USER CAPABILITY) ---
exports.assignJob = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { jobId } = req.params;
        const { userId } = req.body; 

        const job = await Job.findById(jobId).session(session);
        if (!job) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Job not found' });
        }

        // 1. Check Positions Availability
        const maxPositions = job.positionsAvailable || 1;
        // Count how many are currently accepted/assigned
        const currentHiredCount = job.applicants.filter(a => a.status === 'accepted').length;

        if (currentHiredCount >= maxPositions) {
            await session.abortTransaction();
            return res.status(400).json({ message: `All ${maxPositions} positions have been filled.` });
        }

        // 2. Find and Update Target Applicant
        const applicantToHire = job.applicants.find(
            app => app.user && app.user.toString() === userId.toString()
        );

        if (!applicantToHire) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'User has not applied to this job.' });
        }

        // Update status to 'accepted'
        applicantToHire.status = 'accepted'; 
        
        // 3. Check if Job is NOW Full
        // We add 1 because we just marked this person as accepted
        const isNowFull = (currentHiredCount + 1) >= maxPositions;
        const rejectedIds = [];

        if (isNowFull) {
            job.status = 'Assigned'; // Mark job as fully assigned

            // Auto-reject remaining pending/shortlisted applicants
            job.applicants.forEach(app => {
                if (app.status === 'pending' || app.status === 'shortlisted') {
                    app.status = 'rejected';
                    rejectedIds.push(app.user.toString());
                }
            });
        }
        
        // 🚨 UPDATE: Add to Array (Multi-User safe)
        if (!job.assignedTo.includes(userId)) {
            job.assignedTo.push(userId);
        }

        await job.save({ session });

        // 4. Notifications
        const notifications = [];

        // Notify Winner
        notifications.push({
            recipient: userId,
            type: 'JOB_ASSIGNED',
            message: `Congratulations! You have been selected for the project: "${job.projectName}".`,
            relatedJob: job._id,
            isRead: false
        });

        // Notify Losers (Only if the job closed)
        if (rejectedIds.length > 0) {
            rejectedIds.forEach(loserId => {
                notifications.push({
                    recipient: loserId,
                    type: 'JOB_REJECTED',
                    message: `Update on "${job.projectName}": The positions have been filled.`,
                    relatedJob: job._id,
                    isRead: false
                });
            });
        }

        if (notifications.length > 0) {
            await Notification.insertMany(notifications, { session });
        }

        await session.commitTransaction();
        res.json({ message: 'Job assigned successfully', job, isFull: isNowFull });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Assign Job Error:", error);
        res.status(500).json({ message: 'Failed to assign job' });
    } finally {
        session.endSession();
    }
};

// --- REJECT APPLICANT ---
exports.rejectApplicant = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const app = job.applicants.find(a => 
            a.user && a.user.toString() === userId.toString()
        );

        if (!app) return res.status(400).json({ message: 'User is not an applicant' });

        app.status = 'rejected';

        await job.save();

        await Notification.create({
            recipient: userId,
            type: 'JOB_REJECTED',
            message: `Update on your application for "${job.projectName}".`,
            relatedJob: job._id
        });

        res.json({ message: 'Applicant rejected', applicantId: userId });

    } catch (error) {
        console.error("Reject Error:", error);
        res.status(500).json({ message: 'Failed to reject applicant' });
    }
};

// --- UNASSIGN JOB (Specific User) ---
exports.unassignJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        if (!userId) {
             return res.status(400).json({ message: 'User ID is required to unassign.' });
        }

        const app = job.applicants.find(a => a.user && a.user.toString() === userId.toString());

        if (!app || (app.status !== 'accepted')) {
             return res.status(400).json({ message: 'This user is not currently hired.' });
        }

        // 1. Reset Status
        app.status = 'pending';

        // 2. Re-Open Job if it was closed
        // Since we just freed up a slot, the job is definitely not full anymore
        if (job.status === 'Assigned' || job.status === 'Completed') {
            job.status = 'Open';
        }

        job.assignedTo.pull(userId);
        
        await job.save();

        // 3. Notification
        await Notification.create({
            recipient: userId,
            type: 'SYSTEM',
            message: `Your assignment to "${job.projectName}" has been cancelled.`,
            relatedJob: job._id
        });

        res.json({ message: 'User unassigned. Job slot re-opened.', job });

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

        const app = job.applicants.find(a => 
            a.user && a.user.toString() === userId.toString()
        );

        if (!app) return res.status(400).json({ message: 'User is not an applicant' });

        app.status = 'pending';

        await job.save();

        await Notification.create({
            recipient: userId,
            type: 'SYSTEM',
            message: `Good news! Your application for "${job.projectName}" is back under review.`,
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

        app.status = 'shortlisted';
        await job.save();
        
        res.json({ message: 'Applicant shortlisted', applicantId: userId });

    } catch (error) {
        console.error("Shortlist Error:", error);
        res.status(500).json({ message: 'Failed to shortlist applicant' });
    }
};

exports.undoShortlistApplicant = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const app = job.applicants.find(a => a.user && a.user.toString() === userId.toString());
        if (!app) return res.status(400).json({ message: 'User is not an applicant' });

        app.status = 'pending';
        await job.save();

        res.json({ message: 'Applicant removed from shortlist', applicantId: userId });

    } catch (error) {
        console.error("Undo Shortlist Error:", error);
        res.status(500).json({ message: 'Failed to update applicant' });
    }
};

exports.reviewJobPerformance = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { rating, feedback, userId } = req.body; 
        const jobId = req.params.jobId;

        // 1. Validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // 2. Find Job
        const job = await Job.findById(jobId).session(session);
        if (!job) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Job not found' });
        }

        // 3. Find the Applicant Subdocument
        const applicantEntry = job.applicants.find(
            app => app.user.toString() === userId.toString()
        );

        if (!applicantEntry) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Applicant not found in this job' });
        }

        // 4. Update the Applicant's Rating
        applicantEntry.rating = rating;
        applicantEntry.ratingNote = feedback;
        applicantEntry.ratedAt = new Date();

        // 🚨 MULTI-USER CHECK: Only mark job as Completed if ALL hired users are done?
        // For simplicity, we allow the admin to manually toggle Job Status. 
        // We DO NOT force the whole job to 'Completed' here automatically 
        // because other collaborators might still be working.
        
        await job.save({ session });

        // 5. AGGREGATION: Recalculate User's Average
        const stats = await Job.aggregate([
            { $unwind: "$applicants" }, 
            { 
                $match: { 
                    "applicants.user": new mongoose.Types.ObjectId(userId), 
                    "applicants.rating": { $ne: null } 
                } 
            },
            { 
                $group: { 
                    _id: "$applicants.user", 
                    averageRating: { $avg: "$applicants.rating" },
                    totalJobs: { $sum: 1 }
                } 
            }
        ]).session(session);

        // 6. Update User Profile
        if (stats.length > 0) {
            await BaseUser.findByIdAndUpdate(userId, {
                'jobRatingStats.average': Math.round(stats[0].averageRating * 10) / 10,
                'jobRatingStats.count': stats[0].totalJobs
            }, { session });
        }

        await session.commitTransaction();
        session.endSession();

        res.json({ 
            message: 'Applicant rated successfully', 
            updatedApplicant: applicantEntry 
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Review Job Error:", error);
        res.status(500).json({ message: 'Failed to save review' });
    }
};