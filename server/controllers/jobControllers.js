const BaseUser = require('../models/BaseUser');
const Notification = require('../models/Notification');
const Job = require('../models/Job');
const mongoose = require('mongoose');

// --- 1. CREATE Job ---
exports.createJob = async (req, res) => {
    try {
        const { 
            projectName, projectDescription, deliverables, 
            projectStartDate, projectEndDate, shootingDates,
            projectLanguage, targetRole, rate, imageRightsDuration,
            positionsAvailable 
        } = req.body;

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
            positionsAvailable: positionsAvailable || 1,
            status: 'Open', 
            createdBy: req.user,
            assignedTo: [],
            // rejectedApplicants removed (Single Source of Truth)
        });

        res.status(201).json({ message: 'Job created successfully', job: newJob });
    } catch (error) {
        console.error("Create Job Error:", error);
        res.status(500).json({ message: 'Failed to create job', error: error.message });
    }
};

// --- 2. GET ALL JOBS (The Filter Logic) ---
exports.getAllJobs = async (req, res) => {
    
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const currentUserId = req.user._id || req.user; 
        const { search, status, targetRole } = req.query;
        
        let query = {};

        // --- FILTERING ---
        if (req.userType === 'LinkVidsAdmin') {
             if (status && status !== 'all') query.status = status;
             if (targetRole && targetRole !== 'all') query.targetRole = targetRole;
        } else {
            // Collaborator Logic
            if (targetRole && targetRole !== 'all') {
                query.targetRole = targetRole;
            }

            switch (status) {
                case 'Applied':
                    // Any application record exists
                    // query['applicants.user'] = currentUserId;
                     query.applicants = {
                        $elemMatch: { user: currentUserId, status: {$in: ['pending', 'viewed']}}
                    };
                    break;

                case 'Shortlisted':
                    // Job is Open AND User is Shortlisted
                    query.status = 'Open';
                    query.applicants = {
                        $elemMatch: { user: currentUserId, status: 'shortlisted' }
                    };
                    break;

                case 'Rejected':
                     // ✅ CLEANER: Single source check
                     query.applicants = {
                        $elemMatch: { user: currentUserId, status: 'rejected' }
                    };
                    // query['applicants.user'] = currentUserId;
                    // query['applicants.status'] = 'rejected';
                    break;

                case 'Assigned':
                    // ✅ FAST: Use assignedTo array
                    query.assignedTo = currentUserId;
                    query.status = { $ne: 'Completed' }; 
                    break;

                case 'Completed':
                    query.assignedTo = currentUserId;
                    query.status = 'Completed';
                    break;

                case 'Open':
                default:
                    query.status = 'Open';
                    break;
            }
        }

        // Search
        if (search) {
            query.$or = [
                { projectName: { $regex: search, $options: 'i' } },
                { projectDescription: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await Job.countDocuments(query);

        let jobs = await Job.find(query)
            .sort({ projectStartDate: 1 })
            .skip(skip)
            .limit(limit)
            .populate('createdBy', 'name email')
            .lean(); 

        // --- MAPPING & FLAGGING ---
        jobs = jobs.map(job => {
            const userIdStr = currentUserId.toString();

            // 1. Check Assigned (Array)
            const isAssignedToMe = job.assignedTo && job.assignedTo.some(id => 
                id.toString() === userIdStr
            );

            // 2. Find My Application
            const myApplication = job.applicants && job.applicants.find(app => {
                const appId = app.user ? app.user.toString() : app.toString();
                return appId === userIdStr;
            });

            // 3. Flags
            const hasApplied = !!myApplication; 
            const myAppStatus = myApplication ? myApplication.status : null;

            // ✅ CLEANER: Direct status check
            const isRejected = myAppStatus === 'rejected'; 
            const isSelected = myAppStatus === 'accepted'; 
            const isShortlisted = myAppStatus === 'shortlisted';

            const jobData = { 
                ...job, 
                hasApplied,
                isAssignedToMe, 
                isRejected,
                isSelected,
                isShortlisted,
                myApplicationStatus: myAppStatus,
                applicantCount: job.applicants ? job.applicants.length : 0
            };

            if (req.userType !== 'LinkVidsAdmin') {
                delete jobData.applicants;
                // delete jobData.rejectedApplicants; // Removed from schema, so no need to delete
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

// --- 3. GET ONE JOB ---
exports.getJobById = async (req, res) => {
    try {
        const { jobId } = req.params;
        const currentUserId = req.user.toString(); 

        const jobDoc = await Job.findById(jobId)
            .populate('createdBy', 'username email companyName profile_picture')
            .populate('assignedTo', 'username email'); 
        
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

// --- 4. UPDATE JOB ---
exports.updateJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const updates = { ...req.body };

        // Protect critical fields
        delete updates.applicants; 
        delete updates.createdBy; 
        delete updates._id;
        delete updates.assignedTo; 
        
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

// --- 5. DELETE JOB ---
exports.deleteJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await Job.findByIdAndDelete(jobId);

        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Notify applicants
        if (job.applicants && job.applicants.length > 0) {
            const applicantIds = job.applicants.map(app => app.user);
            const notifications = applicantIds.map(userId => ({
                recipient: userId,
                type: 'SYSTEM',
                message: `The job "${job.projectName}" has been closed/removed.`,
                relatedJob: null, 
                isRead: false
            }));

            if (notifications.length > 0) await Notification.insertMany(notifications);
        }

        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error("Delete Job Error:", error);
        res.status(500).json({ message: 'Delete failed' });
    }
};

// --- 6. TOGGLE APPLICATION (Apply / Withdraw) ---
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
            // WITHDRAW: Remove completely from array
            // This is cleaner than setting status='withdrawn' because if they apply again,
            // we just push a fresh object.
            job.applicants.splice(existingAppIndex, 1);
            await job.save();
            return res.json({ message: 'Application withdrawn', hasApplied: false });
        } else {
            // APPLY
            if (job.status !== 'Open') {
                return res.status(400).json({ message: 'Job is not accepting applications' });
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
            
            // Send to Admin (Optimize by finding only relevant admins if needed)
            const admins = await BaseUser.find({ userType: 'LinkVidsAdmin' }).select('_id');
            if (admins.length > 0) {
                const notes = admins.map(admin => ({
                    recipient: admin._id,
                    type: 'SYSTEM',
                    message: `New App: ${applicantName} applied for "${job.projectName}".`,
                    relatedJob: job._id,
                    isRead: false
                }));
                await Notification.insertMany(notes);
            }

            return res.json({ message: 'Application submitted', hasApplied: true });
        }

    } catch (error) {
        console.error("Application Toggle Error:", error);
        res.status(500).json({ message: 'Failed to process application' });
    }
};

// --- 7. ASSIGN JOB (The Logic Hub) ---
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

        const maxPositions = job.positionsAvailable || 1;
        const currentHiredCount = job.applicants.filter(a => a.status === 'accepted').length;

        if (currentHiredCount >= maxPositions) {
            await session.abortTransaction();
            return res.status(400).json({ message: `All ${maxPositions} positions filled.` });
        }

        const applicantToHire = job.applicants.find(
            app => app.user && app.user.toString() === userId.toString()
        );

        if (!applicantToHire) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'User has not applied.' });
        }

        // 1. UPDATE STATUS
        applicantToHire.status = 'accepted'; 
        
        // 2. CHECK IF JOB IS FULL
        const isNowFull = (currentHiredCount + 1) >= maxPositions;
        const rejectedIds = [];

        if (isNowFull) {
            job.status = 'Assigned'; 

            // ✅ CLEANER: Auto-reject others by status only
            job.applicants.forEach(app => {
                if (app.status === 'pending' || app.status === 'shortlisted') {
                    app.status = 'rejected';
                    rejectedIds.push(app.user.toString());
                }
            });
        }
        
        // 3. UPDATE FAST ACCESS ARRAY
        if (!job.assignedTo.includes(userId)) {
            job.assignedTo.push(userId);
        }

        await job.save({ session });

        // 4. NOTIFICATIONS
        const notifications = [];
        // Winner
        notifications.push({
            recipient: userId,
            type: 'JOB_ASSIGNED',
            message: `Congratulations! You have been selected for: "${job.projectName}".`,
            relatedJob: job._id
        });

        // Losers (If full)
        if (rejectedIds.length > 0) {
            rejectedIds.forEach(loserId => {
                notifications.push({
                    recipient: loserId,
                    type: 'JOB_REJECTED',
                    message: `Update on "${job.projectName}": Positions filled.`,
                    relatedJob: job._id
                });
            });
        }

        await Notification.insertMany(notifications, { session });
        await session.commitTransaction();
        
        res.json({ message: 'Job assigned successfully', job, isFull: isNowFull });

    } catch (error) {
        await session.abortTransaction();
        console.error("Assign Job Error:", error);
        res.status(500).json({ message: 'Failed to assign job' });
    } finally {
        session.endSession();
    }
};

// --- 8. REJECT APPLICANT (Manual) ---
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

        // ✅ CLEANER: Just update status
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

// --- 9. UNASSIGN JOB ---
exports.unassignJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const app = job.applicants.find(a => a.user && a.user.toString() === userId.toString());

        if (!app || (app.status !== 'accepted')) {
             return res.status(400).json({ message: 'User is not currently hired.' });
        }

        // 1. Reset Status
        app.status = 'pending';

        // 2. Re-Open Job
        if (job.status === 'Assigned' || job.status === 'Completed') {
            job.status = 'Open';
        }

        // 3. Remove from fast access array
        job.assignedTo.pull(userId);
        
        await job.save();

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

// --- 10. RESTORE APPLICANT (Un-reject) ---
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

        // ✅ CLEANER: Just reset status
        app.status = 'pending';

        await job.save();
        
        // Notify user
        await Notification.create({
            recipient: userId,
            type: 'SYSTEM',
            message: `Good news! Your application for "${job.projectName}" is back under review.`,
            relatedJob: job._id
        });

        res.json({ message: 'Applicant restored', applicantId: userId });

    } catch (error) {
        console.error("Unreject Error:", error);
        res.status(500).json({ message: 'Failed to restore applicant' });
    }
};

// --- 11. SHORTLIST ---
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

// --- 12. STATS & REVIEWS (Unchanged logic, just ensure consistency) ---
exports.getCollaboratorStats = async (req, res) => {
    try {
        const userId = req.user; 
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const activeApplications = await Job.countDocuments({
            applicants: { $elemMatch: { user: userObjectId, status: 'pending' } }, 
            status: 'Open'
        });

        const completedStats = await Job.aggregate([
            {
                $match: {
                    // Check logic for 'accepted' status inside applicants
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

        res.json({
            activeApplications,
            jobsCompleted: completedStats[0]?.count || 0,
            totalEarnings: completedStats[0]?.totalEarnings || 0
        });

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
                path: 'applicants.user', 
                select: 'name username email profile_picture collaboratorType city country jobRatingStats' 
            });

        //console.log(job)

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
                userAvgRating: app.user.jobRatingStats.average,
                userCountRatings: app.user.jobRatingStats.count,
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

exports.reviewJobPerformance = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { rating, feedback, userId } = req.body; 
        const jobId = req.params.jobId;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const job = await Job.findById(jobId).session(session);
        if (!job) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Job not found' });
        }

        const applicantEntry = job.applicants.find(
            app => app.user.toString() === userId.toString()
        );

        if (!applicantEntry) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Applicant not found in this job' });
        }

        applicantEntry.rating = rating;
        applicantEntry.ratingNote = feedback;
        applicantEntry.ratedAt = new Date();

        await job.save({ session });

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

        if (stats.length > 0) {
            await BaseUser.findByIdAndUpdate(userId, {
                'jobRatingStats.average': Math.round(stats[0].averageRating * 10) / 10,
                'jobRatingStats.count': stats[0].totalJobs
            }, { session });
        }

        await session.commitTransaction();
        res.json({ message: 'Applicant rated successfully' });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Review Job Error:", error);
        res.status(500).json({ message: 'Failed to save review' });
    } finally {
        session.endSession();
    }
};

exports.getAllApplications = async (req, res) => {
    try {
        // 1. Extract Query Parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status; // e.g., 'pending' or 'pending,shortlisted'
        const search = req.query.search; // Optional: Search by candidate name or job title

        const skip = (page - 1) * limit;

        // 2. Build the Match Stage (Filter Logic)
        let matchConditions = {};

        // Filter by Status (supports comma separated: ?status=pending,shortlisted)
        if (status && status !== 'All') {
            const statuses = status.split(',');
            matchConditions["applicants.status"] = { $in: statuses };
        }

        // Optional: Filter by Search Term (Regex)
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            matchConditions.$or = [
                { "projectName": searchRegex },
                { "candidate.name": searchRegex },
                { "candidate.email": searchRegex }
            ];
        }

        // 3. Run Aggregation Pipeline
        const result = await Job.aggregate([
            // A. Pre-filter: Only look at jobs that actually have applicants
            { $match: { 'applicants.0': { $exists: true } } },

            // B. Unwind: Deconstruct the applicants array so each application is a document
            { $unwind: "$applicants" },

            // C. Join: Get Candidate Details from 'users' collection
            {
                $lookup: {
                    from: "users", // ⚠️ Ensure this matches your actual MongoDB collection name for users (usually plural, lowercase)
                    localField: "applicants.user",
                    foreignField: "_id",
                    as: "candidate"
                }
            },

            // D. Flatten Candidate: Turn single-item array into object (exclude apps with deleted users)
            { $unwind: "$candidate" },

            // E. Apply Filters: Now we can filter by specific applicant status or candidate name
            { $match: matchConditions },

            // F. Sort: Newest applications first
            { $sort: { "applicants.appliedAt": -1 } },

            // G. Pagination Facet: Run count and data fetch in parallel
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                jobId: "$_id",
                                jobTitle: "$projectName",
                                jobStatus: "$status",
                                applicationId: "$applicants._id",
                                status: "$applicants.status",
                                appliedAt: "$applicants.appliedAt",
                                coverNote: "$applicants.coverNote",
                                candidateId: "$candidate._id",
                                candidateName: { $ifNull: ["$candidate.name", "$candidate.username"] },
                                candidateRating: { $ifNull: ["$candidate.jobRatingStats.average", 0] },
                                candidateRatingCount: { $ifNull: ["$candidate.jobRatingStats.count", 0] },
                                candidateEmail: "$candidate.email",
                                candidateAvatar: "$candidate.profile_picture",
                                candidateLocation: { 
                                    $concat: [
                                        { $ifNull: ["$candidate.city", ""] }, 
                                        { $cond: [{ $and: ["$candidate.city", "$candidate.country"] }, ", ", ""] },
                                        { $ifNull: ["$candidate.country", ""] }
                                    ] 
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        // 4. Format Response
        const data = result[0].data;
        const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

        res.json({
            applications: data,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });

    } catch (error) {
        console.error("Fetch Applications Error:", error);
        res.status(500).json({ message: 'Failed to fetch applications' });
    }
};