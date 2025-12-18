// server/scripts/seedJobs.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
const Job = require('../models/Job');
const UserTypeConfig = require('../models/UserTypeConfig');
const BaseUser = require('../models/BaseUser');

// --- DATA POOLS ---
const ADJECTIVES = ['Viral', 'Cinematic', 'High-Energy', 'Corporate', 'UGC', 'Social Media', 'TV', 'Short', 'Documentary', 'Lifestyle', 'Fashion', 'Tech', 'Educational'];
const NOUNS = ['TikTok Campaign', 'Brand Commercial', 'Instagram Reels', 'Youtube Series', 'Product Unboxing', 'Photo Shoot', 'Voiceover Project', 'Event Coverage', 'Testimonial Video'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese'];
const RIGHTS = ['3 Months Internet', '1 Year Digital', '2 Years Full Buyout', 'Perpetuity', 'Social Media Only', 'Internal Use Only'];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateDate = (start, daysToAdd) => {
    const date = new Date(start);
    date.setDate(date.getDate() + daysToAdd);
    return date;
};

const seedJobs = async () => {
    try {
        console.log('🌱 Connecting to Database...');
        await mongoose.connect(process.env.DATABASE_URI);

        // 1. Get an Admin ID to be the owner
        const admin = await BaseUser.findOne({ userType: 'LinkVidsAdmin' });
        if (!admin) {
            throw new Error('❌ No Admin user found. Please run the fixAdmin.js script first.');
        }

        // 2. Get User Types (so we assign jobs to real roles)
        const userTypes = await UserTypeConfig.find({});
        if (userTypes.length === 0) {
            throw new Error('❌ No User Types found. Please create User Types in the Admin Panel first.');
        }
        const userTypeSlugs = userTypes.map(t => t.slug);

        console.log(`ℹ️  Found Admin: ${admin.email}`);
        console.log(`ℹ️  Found ${userTypeSlugs.length} User Types: ${userTypeSlugs.join(', ')}`);

        // 3. Generate Jobs
        const jobs = [];
        const STATUS_DISTRIBUTION = ['Open', 'Open', 'Open', 'Open', 'Draft', 'Assigned', 'Completed', 'Cancelled']; // Weighted towards Open

        console.log('⚙️  Generating 100 Jobs...');

        for (let i = 0; i < 100; i++) {
            const startDate = generateDate(new Date(), getRandomInt(-10, 60)); // Some in past, mostly future
            const endDate = generateDate(startDate, getRandomInt(5, 30));
            
            // Generate 1-3 shooting dates within the range
            const shootingDates = [];
            const numShoots = getRandomInt(1, 3);
            for(let j=0; j<numShoots; j++) {
                shootingDates.push(generateDate(startDate, getRandomInt(1, 5)));
            }

            const title = `${getRandomElement(ADJECTIVES)} ${getRandomElement(NOUNS)} ${getRandomInt(2025, 2026)}`;
            
            jobs.push({
                projectName: title,
                projectDescription: `We are looking for a talented professional for a ${title.toLowerCase()}. The project involves creating high-quality assets for our client. Please review the deliverables and apply if you fit the style.`,
                deliverables: `${getRandomInt(1, 5)}x Videos (9:16), ${getRandomInt(3, 10)}x Photos, Raw Footage`,
                projectStartDate: startDate,
                projectEndDate: endDate,
                shootingDates: shootingDates,
                projectLanguage: getRandomElement(LANGUAGES),
                targetRole: getRandomElement(userTypeSlugs), // Assign to random real role
                rate: getRandomInt(150, 2500), // Random rate between 150 and 2500
                imageRightsDuration: getRandomElement(RIGHTS),
                status: getRandomElement(STATUS_DISTRIBUTION),
                createdBy: admin._id
            });
        }

        // 4. Clear old jobs (Optional: Comment out if you want to keep adding)
        await Job.deleteMany({});
        console.log('🗑️  Cleared existing jobs.');

        // 5. Insert New
        await Job.insertMany(jobs);
        console.log('✅ Successfully seeded 100 jobs!');

    } catch (error) {
        console.error('❌ Error seeding jobs:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Connection closed.');
        process.exit();
    }
};

seedJobs();