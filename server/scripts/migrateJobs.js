// server/migrateJobs.js
const mongoose = require('mongoose');
const Job = require('../models/Job'); // Adjust path if needed
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {

    try {
        await mongoose.connect(process.env.DATABASE_URI);
        console.log('MongoDB Connected.');
        

        const jobs = await Job.find({});
        
        for (let job of jobs) {
            // Check if applicants are stored as just ObjectIds (Old Schema)
            if (job.applicants.length > 0 && mongoose.isValidObjectId(job.applicants[0])) {
                console.log(`Migrating Job: ${job.projectName}`);
                
                // Convert [ID, ID] -> [{user: ID}, {user: ID}]
                const newApplicants = job.applicants.map(userId => ({
                    user: userId,
                    appliedAt: job.createdAt, // Estimate date
                    status: 'pending'
                }));

                job.applicants = newApplicants;
                await job.save();
            }
        }
        
        console.log("Migration Complete!");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

migrate();