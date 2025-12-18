// server/scripts/importUGC.js

const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 
// Load .env file from the parent directory (server/)
require('dotenv').config({ path: '../.env' }); 

// --- CONFIGURATION ---
const CSV_FILE_PATH = 'scripts/ugc_users.csv'; 
const TEMP_PASSWORD = 'TempPassword123!'; 
const UGC_SLUG = 'ugc-creator';
const BCRYPT_SALT_ROUNDS = 10;
// ---------------------

// --- Mongoose Model Imports ---
// IMPORTANT: These files (Collaborator.js, BaseUser.js) must exist in server/models/
const Collaborator = require('../models/Collaborator'); 
const BaseUser = require('../models/BaseUser');       
// ------------------------------

// Fields that will be saved directly to the BaseUser model (must match BaseUser.js schema)
const BASE_USER_FIELDS = new Set([
    'first_name', 'last_name', 'email', 'phone', 'address', 'city', 'country'
]);

// --- MAPPING DEFINITIONS (Used to convert CSV headers to database slugs) ---
const CSV_TO_SLUG_MAP = {
    'First Name': 'first_name', 'Last Name': 'last_name', 'Email': 'email',
    'Phone': 'phone', 'Adress': 'address', 'City': 'city', 'Country': 'country',
    
    // Dynamic Fields
    'Gender': 'gender', 'Nationality': 'nationality', 'Year of birth': 'year_of_birth',
    'Work (Portfolio)': 'portfolio_link', 'Website': 'website', 'TikTok': 'tiktok', 
    'Instagram': 'instagram', 'Rate Range': 'rate_range', 'Motivation': 'motivation', 
    'Self Worker': 'self_worker', 'Traits': 'traits', 'Eyes Color': 'eyes_color', 
    'Hair Color': 'hair_color', 'Hair Type': 'hair_type', 'Skin Color': 'skin_color', 
    'Height': 'height', 'T-shirt size': 'tshirt_size', 'Jean size': 'jean_size', 
    'Shoe size': 'shoe_size', 'Voice Over': 'voice_over', 'Categories': 'categories', 
    'Driver Licence': 'driving_license', 'Vehicle': 'vehicle', 'Equipment': 'equipment', 
    'Preferred Platform': 'preferred_platform', 'Source': 'source', 
    'Worked with Linkvids': 'worked_with_linkvids', 'Comments': 'comments', 
    'Are you able to work in Barcelona ?': 'work_in_bcn', 
    'Native Language': 'native_language', 'Other Languages': 'other_languages',
};

async function importUGCUsers() {
    console.log(`\nStarting CSV import for UGC Collaborators (Slug: ${UGC_SLUG})...`);

    let successfulInserts = 0;
    let duplicateErrors = 0;
    let preCheckSkipped = 0;

    try {
        await mongoose.connect(process.env.DATABASE_URI);
        console.log('MongoDB Connected.');

        const hashedPassword = await bcrypt.hash(TEMP_PASSWORD, BCRYPT_SALT_ROUNDS);
        const usersToProcess = [];

        // 1. Read and Transform Data from CSV Stream
        const stream = fs.createReadStream(CSV_FILE_PATH).pipe(csv());

        for await (const row of stream) {
            const baseUserPayload = {};
            const groupSpecificAttributes = {};
            let hasEmail = false;

            for (const header in row) {
                const slug = CSV_TO_SLUG_MAP[header];
                const value = row[header] ? row[header].trim() : '';

                if (!slug || !value) continue;

                if (slug === 'email') {
                    baseUserPayload[slug] = value.toLowerCase();
                    hasEmail = true;
                } 
                else if (BASE_USER_FIELDS.has(slug)) {
                    baseUserPayload[slug] = value;
                } else {
                    groupSpecificAttributes[slug] = value;
                }
            }

            if (!hasEmail) {
                console.warn(`Skipping row due to missing email: ${row['Full Name'] || 'Unknown'}`);
                continue;
            }

            // NAME COMPOSITION LOGIC
            const firstName = baseUserPayload.first_name || '';
            const lastName = baseUserPayload.last_name || '';
            let compositeName = `${firstName} ${lastName}`.trim();
            if (!compositeName) {
                compositeName = baseUserPayload.email;
            }
            
            // Construct the final Collaborator payload
            usersToProcess.push({
                ...baseUserPayload,
                name: compositeName,
                password: hashedPassword,
                userType: 'Collaborator',
                collaboratorType: UGC_SLUG,
                groupSpecificAttributes: groupSpecificAttributes,
            });
        }

        // 2. Pre-Check for Duplicates (Fast filter)
        const emails = usersToProcess.map(u => u.email);
        const existingUsers = await Collaborator.find({ email: { $in: emails } }, { email: 1 }).exec();
        const existingEmails = new Set(existingUsers.map(u => u.email));

        const newUsers = usersToProcess.filter(u => !existingEmails.has(u.email));
        preCheckSkipped = usersToProcess.length - newUsers.length;
        
        // 3. Insert New Users One-by-One (Slow but robust error handling)
        console.log(`\nAttempting to insert ${newUsers.length} users...`);

        for (const userPayload of newUsers) {
            try {
                // Use .create() to insert individually and catch unique errors
                await Collaborator.create(userPayload);
                successfulInserts++;
            } catch (error) {
                if (error.code === 11000) { // MongoDB duplicate key error code
                    duplicateErrors++;
                    const dupKeyMatch = error.message.match(/dup key: \{ [a-z_]+: "([^"]+)" \}/);
                    const dupKeyValue = dupKeyMatch ? dupKeyMatch[1] : userPayload.email;
                    
                    console.warn(`\n⚠️ DUPLICATION CONFLICT: Email '${dupKeyValue}' already exists in DB (Index Check Failed). Skipping.`);
                } else {
                    console.error(`\n❌ UNEXPECTED ERROR saving user ${userPayload.email}:`, error.message);
                }
            }
        }
        
        // 4. Final Report
        console.log(`\n======================================================`);
        console.log(`✅ IMPORT PROCESS COMPLETE`);
        console.log(`   - Total Users Found in CSV: ${usersToProcess.length}`);
        console.log(`   - Users Skipped (Pre-Check): ${preCheckSkipped}`);
        console.log(`   - Users Skipped (During Insert/Conflict): ${duplicateErrors}`);
        console.log(`   - Total Users Successfully Created: ${successfulInserts}`);
        console.log(`======================================================`);

    } catch (error) {
        console.error('\n❌ CRITICAL CONNECTION/FILE ERROR:', error.message);
        console.error('Check your DATABASE_URI and CSV path/headers.');
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
}

importUGCUsers();