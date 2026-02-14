// server/controllers/userController.js
const Collaborator = require('../models/Collaborator');
const Agency = require('../models/Agency'); 
const BaseUser = require('../models/BaseUser');
const Job = require('../models/Job');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Fields stored directly on the BaseUser document (must match schema)
const BASE_USER_FIELDS = new Set([
    'email', 'name', 'first_name', 'last_name', 'phone', 
    'address', 'city', 'country', 'zipCode', 
]);
const BASE_SEARCHABLE_FIELDS = ['first_name', 'last_name', 'email'];

// Fields that are stored directly on the BaseUser document and are filterable
const STATIC_FILTERABLE_FIELDS = new Set([
    'city', 'country', 'phone', 'address', 'zipCode', 'email',
    'collaboratorType', 'agencyType'
]);

// -----------------------------------------------------------
// --- Helper: Query Builder for List and Filter Operations --
// -----------------------------------------------------------
const buildUserQuery = (query) => {
    // Default values
    const limit = parseInt(query.limit) || 20;
    const page = parseInt(query.page) || 1;
    const search = query.search || '';
    
    // Deconstruct fields from query, excluding pagination/search parameters
    const { userType, limit: qLimit, page: qPage, search: qSearch, ...attributeFilters } = query; 

    const mongoQuery = {};
    const skip = (page - 1) * limit;
    
    // 1. Global Search by Name/Email (OR condition)
    if (search) {
        const regex = new RegExp(search, 'i');
        mongoQuery.$or = BASE_SEARCHABLE_FIELDS.map(field => ({
            [field]: regex
        }));
        mongoQuery.$or.push({ name: regex }); 
    }

    // 2. Filter by User Type
    if (userType) {
        mongoQuery.userType = userType;
    }
    
    const dynamicQuery = {};
    for (const [key, value] of Object.entries(attributeFilters)) {
        if (!value || value === 'all' || value === undefined) continue; 

        if (STATIC_FILTERABLE_FIELDS.has(key)) {
            mongoQuery[key] = value;
        } else {
            if (value === 'true') {
                dynamicQuery[`groupSpecificAttributes.${key}`] = true;
            } else if (value === 'false') {
                dynamicQuery[`groupSpecificAttributes.${key}`] = { $in: [false, "false", null, ""] };
            } else {
                dynamicQuery[`groupSpecificAttributes.${key}`] = value;
            }      
        }
    }

    // Merge dynamic filters into the main query
    if (Object.keys(dynamicQuery).length > 0) {
        Object.assign(mongoQuery, dynamicQuery);
    }

    //console.log(mongoQuery)

    return { mongoQuery, limit, skip };
};


// -----------------------------------------------------------
// --- CREATE (POST /api/collaborators/create) -----------------------
// -----------------------------------------------------------
exports.createNewUser = async (req, res) => {
    const { userType, collaboratorType, agencyType, password, ...formData } = req.body;
    
    if (!userType || !password || !formData.email) {
        return res.status(400).json({ message: 'UserType, email, and password are required.' });
    }

    const duplicate = await BaseUser.findOne({ email: formData.email.toLowerCase() }).exec();
    if (duplicate) {
        return res.status(409).json({ message: 'User already exists with this email address.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let finalBasePayload = { password: hashedPassword, userType, email: formData.email.toLowerCase() };
        const groupSpecificAttributes = {};
        let Model; 

        for (const key in formData) {
            if (key === 'email' || key === 'password' || key === 'userType' || key === 'collaboratorType' || key === 'agencyType') continue; 

            if (BASE_USER_FIELDS.has(key)) {
                finalBasePayload[key] = formData[key];
            } else {
                groupSpecificAttributes[key] = formData[key];
            }
        }
        
        if (userType === 'Collaborator') {
            Model = Collaborator;
            finalBasePayload.collaboratorType = collaboratorType;
        } else if (userType === 'Agency') {
            Model = Agency;
            finalBasePayload.agencyType = agencyType;
        } else {
            return res.status(400).json({ message: 'Invalid userType specified.' });
        }

        if (!finalBasePayload.name) {
            finalBasePayload.name = `${finalBasePayload.first_name || ''} ${finalBasePayload.last_name || ''}`.trim() || finalBasePayload.email;
        }

        const finalPayload = {
            ...finalBasePayload,
            groupSpecificAttributes: groupSpecificAttributes
        };

        const newUser = await Model.create(finalPayload);
        
        const userResponse = newUser.toObject();
        delete userResponse.password;
        delete userResponse.refreshToken;

        res.status(201).json({ message: 'User created successfully.', user: userResponse });

    } catch (error) {
        console.error('New User Creation Error:', error.message);
        res.status(500).json({ message: 'Failed to create user due to server error.', error: error.message });
    }
};

// -----------------------------------------------------------
// --- READ ALL (GET /api/collaborators) -----------------------------
// -----------------------------------------------------------
exports.getAllUsers = async (req, res) => {
    try {
        const { mongoQuery, limit, skip } = buildUserQuery(req.query);

        if (!mongoQuery.userType) {
            // Scenario A: User wants "All Users". We explicitly exclude Admins.
            mongoQuery.userType = { $ne: 'LinkVidsAdmin' };
        } else if (mongoQuery.userType === 'LinkVidsAdmin') {
            // Scenario B: API explicitly requested Admins. We block this by forcing the exclusion.
            // (This results in 0 matches, effectively hiding them).
            mongoQuery.userType = { $ne: 'LinkVidsAdmin' };
        }

        const totalCount = await BaseUser.countDocuments(mongoQuery);

        const users = await BaseUser.find(mongoQuery)
            .sort({ createdAt: -1 }) 
            .limit(limit)
            .skip(skip)
            .exec();
        
        const safeUsers = users.map(user => {
            const userObj = user.toObject();
            delete userObj.password;
            delete userObj.refreshToken;
            return userObj;
        });

        res.json({
            data: safeUsers,
            metadata: {
                total: totalCount,
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: limit
            }
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to retrieve user list.' });
    }
};

// -----------------------------------------------------------
// --- READ ONE (GET /api/collaborators/:userId) ---------------------
// -----------------------------------------------------------
exports.getUserById = async (req, res) => {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {      
        return res.status(400).json({ message: 'Invalid User ID format.' });
    }

    try {
        //const user = await BaseUser.findById(userId).lean();
        let query = BaseUser.findById(userId);

        if (req.user && req.userType === 'LinkVidsAdmin') {
            query = query.select('+adminRatingNotes');
        }

        // 3. Execute
        const user = await query.lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        delete user.password;
        delete user.refreshToken;
        
        res.json(user);

    } catch (error) {
        console.error('Error fetching user for edit:', error);
        res.status(500).json({ message: 'Failed to retrieve user data.' });
    }
};

// -----------------------------------------------------------
// --- UPDATE (PUT /api/collaborators/:userId) -----------------------
// -----------------------------------------------------------
// server/controllers/userController.js

// ... imports and constants ...

exports.updateExistingUser = async (req, res) => {
    const { userId } = req.params;
    const { userType, collaboratorType, agencyType, password, ...formData } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid User ID format.' });
    }

    try {
        // 1. Find the user document first
        const user = await BaseUser.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // 2. Update Static BaseUser Fields
        // Iterate over the known base fields and update if present in formData
        BASE_USER_FIELDS.forEach(field => {
            if (formData[field] !== undefined) {
                user[field] = formData[field];
            }
        });

        // Handle Name composition if first/last provided
        if (formData.first_name || formData.last_name) {
            const fName = formData.first_name || user.first_name || '';
            const lName = formData.last_name || user.last_name || '';
            user.name = `${fName} ${lName}`.trim();
        }

        // Handle Password Update
        if (password) {
            console.log('we are updating password....')
            user.password = await bcrypt.hash(password, 10);
        }
        

        // 3. Update Dynamic Attributes (The Fix)
        const updateDynamicAttributes = {};
        
        for (const key in formData) {
            // If it's not a base field, and not a reserved key, it's dynamic
            if (!BASE_USER_FIELDS.has(key) && key !== 'email' && key !== 'password') {
                updateDynamicAttributes[key] = formData[key];
            }
        }

        // 🚨 CRITICAL FIX: Merge with existing attributes instead of overwriting 🚨
        // This ensures that fields NOT in the form (like your photos!) are preserved.
        const currentAttributes = user.groupSpecificAttributes || {};
        user.groupSpecificAttributes = { ...currentAttributes, ...updateDynamicAttributes };

        // 🚨 CRITICAL FIX: Explicitly tell Mongoose the Mixed field changed 🚨
        user.markModified('groupSpecificAttributes');

        // 4. Save the document
        const updatedUser = await user.save();

        res.json({ message: 'User updated successfully.', user: updatedUser });

    } catch (error) {
        console.error('Update User Error:', error.message);
        res.status(500).json({ message: 'Failed to update user.', error: error.message });
    }
};


// -----------------------------------------------------------
// --- DELETE (DELETE /api/collaborators/:userId) --------------------
// -----------------------------------------------------------
exports.deleteUser = async (req, res) => {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid User ID format.' });
    }

    try {
        const result = await BaseUser.findByIdAndDelete(userId);

        if (!result) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        res.status(200).json({ message: 'User successfully deleted.' });

    } catch (error) {
        console.error('User deletion error:', error);
        res.status(500).json({ message: 'Failed to delete user due to server error.' });
    }
};

// server/controllers/userController.js

exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id || req.user;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const [user, statsResult] = await Promise.all([
            BaseUser.findById(userId)
                .select('profile_picture phone city country financial_profile groupSpecificAttributes')
                .lean(),
            Job.aggregate([
                {
                    // 1. MATCH: Find jobs where user is an Applicant OR is Assigned
                    $match: {
                        $or: [
                            { 'applicants.user': userObjectId },
                            { 'assignedTo': userObjectId }
                        ]
                    }
                },
                {
                    // 2. PROJECT: Extract necessary fields and the specific user's application
                    $project: {
                        status: 1, // Job Status
                        rate: 1,
                        assignedTo: { $ifNull: ["$assignedTo", []] }, // Ensure array exists
                        myApplication: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$applicants",
                                        as: "app",
                                        cond: { $eq: ["$$app.user", userObjectId] }
                                    }
                                },
                                0
                            ]
                        }
                    }
                },
                {
                    // 3. GROUP: Calculate counts based on strict logic
                    $group: {
                        _id: null,

                        // A. PENDING APPLICATIONS (Replaces "Active")
                        // Logic: Job is OPEN + User Status is 'pending' or 'viewed'
                        activeApplications: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$status", "Open"] },
                                            { $in: ["$myApplication.status", ["pending", "viewed"]] }
                                        ]
                                    }, 1, 0
                                ]
                            }
                        },

                        // B. SHORTLISTED
                        // Logic: Job is OPEN + User Status is 'shortlisted'
                        shortlistedApplications: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$status", "Open"] },
                                            { $eq: ["$myApplication.status", "shortlisted"] }
                                        ]
                                    }, 1, 0
                                ]
                            }
                        },

                        // C. REJECTED
                        // Logic: User Status is 'rejected' (Any job status)
                        rejectedApplications: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$myApplication.status", "rejected"] }, 
                                    1, 0
                                ]
                            }
                        },

                        // D. ASSIGNED JOBS (Strictly NOT Completed)
                        // Logic: Job Status is 'Assigned' (or 'In Progress') AND User is in assignedTo
                       assignedJobs: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$status", "Open"] },
                                            { $eq: ["$myApplication.status", "accepted"] }
                                        ]
                                        
                                        // $and: [
                                        //     // 1. Am I assigned?
                                        //     { $in: [userObjectId, "$assignedTo"] },
                                        //     // 2. Is the job still active? (NOT Completed, Cancelled, or Draft)
                                        //     // This explicitly ALLOWS "Open" jobs
                                        //     { $nin: ["$status", ["Completed", "Cancelled", "Draft"]] }
                                        // ]
                                    }, 1, 0
                                ]
                            }
                        },

                        // E. COMPLETED JOBS
                        // Logic: Job Status is 'Completed' AND User is in assignedTo
                        jobsCompleted: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$status", "Completed"] },
                                            { $in: [userObjectId, "$assignedTo"] }
                                        ]
                                    }, 1, 0
                                ]
                            }
                        },

                        // F. EARNINGS (From Completed Jobs only)
                        totalEarnings: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$status", "Completed"] },
                                            { $in: [userObjectId, "$assignedTo"] }
                                        ]
                                    }, "$rate", 0
                                ]
                            }
                        }
                    }
                }
            ])
        ]);

        if (!user) return res.status(404).json({ message: 'User not found' });

        // --- PROFILE SCORE CALCULATION ---
        const checks = [
            { field: 'profile_picture', points: 20 },
            { field: 'phone', points: 10 },
            { field: 'city', points: 5 },
            { field: 'country', points: 5 },
            { field: 'financial_profile.iban', points: 30 },
            { field: 'groupSpecificAttributes', points: 30, check: (u) => u.groupSpecificAttributes && Object.keys(u.groupSpecificAttributes).length > 0 }
        ];

        let score = 0;
        const missingRequirements = [];

        checks.forEach(({ field, points, check }) => {
            const isValid = check ? check(user) : field.split('.').reduce((o, p) => (o ? o[p] : null), user);
            if (isValid) score += points;
            else missingRequirements.push(field);
        });

        // Default stats if no jobs found
        //console.log(statsResult)
        const stats = statsResult[0] || {
            activeApplications: 0, // This represents "Pending"
            shortlistedApplications: 0,
            rejectedApplications: 0,
            assignedJobs: 0,
            jobsCompleted: 0,
            totalEarnings: 0
        };

        res.json({
            profileCompleteness: Math.min(score, 100),
            missingRequirements,
            ...stats
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: 'Failed to calculate stats' });
    }
};

// Helper for nested properties
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((o, p) => (o ? o[p] : null), obj);
};

// @desc    Rate a user (Internal Admin Use)
// @route   PUT /api/users/:id/rate
exports.rateUser = async (req, res) => {
    try {
        const { rating, notes } = req.body;
        
        const user = await BaseUser.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update fields
        if (rating !== undefined) user.adminRating = rating;
        if (notes !== undefined) user.adminRatingNotes = notes;

        await user.save({ validateBeforeSave: false });

        res.json({ 
            message: 'Rating updated', 
            adminRating: user.adminRating, 
            adminRatingNotes: user.adminRatingNotes 
        });

    } catch (error) {
        console.error("Rate User Error:", error);
        res.status(500).json({ message: 'Failed to update rating' });
    }
};