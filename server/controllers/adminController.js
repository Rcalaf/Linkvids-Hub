const Job = require('../models/Job');
const Notification = require('../models/Notification');
const BaseUser = require('../models/BaseUser');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // Built-in Node module for random strings

// --- HELPER: Generate Random Password ---
const generateRandomPassword = (length = 12) => {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex') // Convert to hexadecimal format
        .slice(0, length); // Return required number of characters
};

// --- 1. CREATE ADMIN (With Random Password) ---
const createAdmin = async (req, res) => {
    const { name, email, permissions, isActive } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required.' });
    }

    try {
        // A. Check for duplicates
        const duplicate = await BaseUser.findOne({ email }).exec();
        if (duplicate) return res.status(409).json({ message: 'Email already exists.' });

        // B. Generate & Hash Password
        const rawPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const newAdmin = await BaseUser.create({
            name,
            email,
            password: hashedPassword,
            userType: 'LinkVidsAdmin',
            profile_picture: null,
            isActive: isActive !== undefined ? isActive : true,
            permissions: permissions || { jobs: 'view', users: 'view', admins: 'none' } 
        });

        res.status(201).json({ 
            success: true, 
            message: `Admin ${name} created.`,
            admin: newAdmin,
            temporaryPassword: rawPassword 
        });

    } catch (err) {
        console.error("Create Admin Error:", err);
        res.status(500).json({ message: 'Failed to create admin.' });
    }
};

// --- 2. GET ALL ADMINS ---
const getAllAdmins = async (req, res) => {
    try {
        const admins = await BaseUser.find({ userType: 'LinkVidsAdmin' })
            .select('-password') // Exclude password hash
            .lean();
        res.json(admins);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch admins.' });
    }
};

// --- 3. GET SINGLE ADMIN (For Edit) ---
const getAdminById = async (req, res) => {
    try {
        const admin = await BaseUser.findOne({ _id: req.params.id, userType: 'LinkVidsAdmin' })
            .select('-password')
            .lean();
            
        if (!admin) return res.status(404).json({ message: 'Admin not found.' });
        
        res.json(admin);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch admin details.' });
    }
};

// --- 4. UPDATE ADMIN ---
const updateAdmin = async (req, res) => {
    const { id } = req.params;
    const { name, email, permissions, isActive, password } = req.body;

    try {
        const admin = await BaseUser.findOne({ _id: id, userType: 'LinkVidsAdmin' });
        if (!admin) return res.status(404).json({ message: 'Admin not found.' });

        if (name) admin.name = name;
        if (email) admin.email = email;
        
        if (permissions) admin.permissions = { ...admin.permissions, ...permissions };
        if (isActive !== undefined) admin.isActive = isActive;

        if (password && password.trim().length > 0) {
            admin.password = await bcrypt.hash(password, 10); 
        }

        await admin.save();
        res.json({ message: 'Admin updated.', admin });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update admin.' });
    }
};

// --- 5. DELETE ADMIN ---
 const deleteAdmin = async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user; // From Token

    try {
        // Prevent deleting yourself
        if (id === currentUserId) {
            return res.status(400).json({ message: 'You cannot delete your own account.' });
        }

        const admin = await BaseUser.findOne({ _id: id, userType: 'LinkVidsAdmin' });
        if (!admin) return res.status(404).json({ message: 'Admin not found.' });

        await BaseUser.findByIdAndDelete(id);

        res.json({ message: 'Admin deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete admin.' });
    }
};

const toggleAdminStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const admin = await BaseUser.findOne({ _id: id, userType: 'LinkVidsAdmin' });
        if (!admin) return res.status(404).json({ message: 'Admin not found.' });

        // Prevent deactivating yourself
        if (id === req.user) return res.status(400).json({ message: 'Cannot deactivate your own account.' });

        admin.isActive = !admin.isActive;
        await admin.save();

        res.json({ message: `Admin is now ${admin.isActive ? 'Active' : 'Inactive'}`, isActive: admin.isActive });
    } catch (err) { 
        res.status(500).json({ message: 'Failed to toggle admin status.' });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        // 1. JOB & APPLICATION STATISTICS
        const jobStats = await Job.aggregate([
            {
                $project: {
                    status: 1, // Keep Job Status for grouping
                    
                    // A. Calculate Total Valid Applications
                    // We filter out any entry where 'user' is null to avoid counting deleted users
                    totalApps: { 
                        $size: { 
                            $filter: {
                                input: { $ifNull: ["$applicants", []] },
                                as: "app",
                                cond: { $ne: ["$$app.user", null] } 
                            }
                        } 
                    },
                    
                    // B. Calculate Pending Applications
                    // (Status must be 'pending' AND user must not be null)
                    pendingApps: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ["$applicants", []] },
                                as: "app",
                                cond: { 
                                    $and: [
                                        { $eq: ["$$app.status", "pending"] },
                                        { $ne: ["$$app.user", null] }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$status", // Group by Job Status (Open, Assigned, etc.)
                    count: { $sum: 1 }, // Count number of jobs in this status
                    totalApplicants: { $sum: "$totalApps" }, // Sum valid applications
                    pendingApplicants: { $sum: "$pendingApps" } // Sum pending applications
                }
            }
        ]);

        // Format the Aggregation Result into a readable object
        const jobsByStatus = jobStats.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, { Open: 0, Assigned: 0, Completed: 0, Draft: 0 });

        // Calculate Totals
        const totalJobs = Object.values(jobsByStatus).reduce((a, b) => a + b, 0);
        const totalApplications = jobStats.reduce((acc, curr) => acc + (curr.totalApplicants || 0), 0);
        const totalPendingApplications = jobStats.reduce((acc, curr) => acc + (curr.pendingApplicants || 0), 0);

        // 2. USER STATISTICS
        const userStats = await BaseUser.aggregate([
            { $match: { userType: { $in: ['Collaborator', 'Agency'] } } },
            {
                $group: {
                    _id: "$userType",
                    count: { $sum: 1 }
                }
            }
        ]);

        const usersByType = userStats.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, { Collaborator: 0, Agency: 0 });

        const totalUsers = (usersByType.Collaborator || 0) + (usersByType.Agency || 0);

        // 3. RECENT ACTIVITY (Notifications)
        const recentActivity = await Notification.find({ recipient: req.user })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('relatedJob', 'projectName');

        // 4. SEND RESPONSE
        res.json({
            jobs: {
                total: totalJobs,
                byStatus: jobsByStatus,
                totalApplications,
                totalPendingApplications // Now accurate and excludes ghost users
            },
            users: {
                total: totalUsers,
                collaborators: usersByType.Collaborator || 0,
                agencies: usersByType.Agency || 0
            },
            recentActivity
        });

    } catch (error) {
        console.error("Admin Stats Error:", error);
        res.status(500).json({ message: 'Failed to load admin stats' });
    }
};

module.exports = {
    getDashboardStats,
    createAdmin,
    getAdminById,
    updateAdmin,
    getAllAdmins,
    deleteAdmin,
    toggleAdminStatus
};