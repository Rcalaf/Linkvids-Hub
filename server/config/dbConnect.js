// server/config/dbConnect.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// --- Import all necessary Models ---
const BaseUser = require('../models/BaseUser');
const LinkVidsAdmin = require('../models/LinkVidsAdmin');
const AttributeDefinition = require('../models/Attributes');
const UserTypeConfig = require('../models/UserTypeConfig');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URI);
        // Run seeding only if connection is successful
        await seedDatabase();
    } catch (err) {
        console.error(`❌ DB Connection Error: ${err.message}`);
        // Exit process if DB connection fails
        process.exit(1); 
    }
}

const seedDatabase = async () => {
    // --- 1. Seed LinkVids Admin User (SuperAdmin) ---
    const adminExists = await BaseUser.findOne({ userType: 'LinkVidsAdmin', permissionLevel: 'SuperAdmin' });

    if (!adminExists) {
        try {
            const hashedPassword = await bcrypt.hash('admin123', 10);

            const adminUser = new LinkVidsAdmin({
                name: 'Super Admin',
                email: 'admin@linkvids.com',
                password: hashedPassword,
                permissionLevel: 'SuperAdmin',
                userType: 'LinkVidsAdmin',
                department: 'Administration'
            });

            await adminUser.save();
            console.log('🌱 Default LinkVids SuperAdmin user created');
        } catch (error) {
            console.error('⚠️ Error creating SuperAdmin:', error.message);
        }
    }

    // --- 2. Seed Dynamic Configurations ---
    await seedAttributeDefinitions();
    await seedUserTypeConfigs();
};

// ... (Helper functions for seeding attributes and user types below)
const seedAttributeDefinitions = async () => {
    if (await AttributeDefinition.countDocuments() === 0) {
        const attributes = [
            // --- Identity & Demographics ---
            { slug: 'first_name', name: 'First Name', fieldType: 'text' },
            { slug: 'last_name', name: 'Last Name', fieldType: 'text' },
            { slug: 'gender', name: 'Gender', fieldType: 'select', defaultOptions: ['Female', 'Male', 'Non-Binary', 'Prefer Not to Say'] },
            { slug: 'native_language', name: 'Native Language', fieldType: 'array', defaultOptions: ['GLOBAL_LANGUAGES'] },
            { slug: 'other_languages', name: 'Other Languages', fieldType: 'array', defaultOptions: ['GLOBAL_LANGUAGES'] },
            { slug: 'nationality', name: 'Nationality', fieldType: 'array', defaultOptions: ['GLOBAL_COUNTRIES'] },
            { slug: 'year_of_birth', name: 'Year of Birth', fieldType: 'number' },

            // --- Contact & Location ---
            { slug: 'email', name: 'Email', fieldType: 'text' },
            { slug: 'phone', name: 'Phone', fieldType: 'number' },
            { slug: 'address', name: 'Address', fieldType: 'text' },
            { slug: 'city', name: 'City', fieldType: 'text' },
            { slug: 'country', name: 'Country', fieldType: 'select', defaultOptions: ['GLOBAL_COUNTRIES']  }, 

            // --- Social & Portfolio Links ---
            { slug: 'portfolio_link', name: 'Work (Portfolio)', fieldType: 'url' },
            { slug: 'website', name: 'Website', fieldType: 'url' },
            { slug: 'tiktok', name: 'TikTok Profile', fieldType: 'url' }, // Using 'url' for profile links is best for validation
            { slug: 'instagram', name: 'Instagram Profile', fieldType: 'url' },
            { slug: 'other_links', name: 'Other Links', fieldType: 'url' },

            // --- Platform Use & Internal ---
            { slug: 'source', name: 'Source', fieldType: 'text' },
            { slug: 'worked_with_linkvids', name: 'Worked with Linkvids', fieldType: 'boolean' },
            { slug: 'work_in_bcn', name: 'Work in BCN', fieldType: 'boolean' },
            { 
                slug: 'areas', 
                name: 'Areas of Expertise', 
                fieldType: 'array', // Use 'array' for multi-select, allowing users to have multiple roles
                defaultOptions: [
                    // --- Production ---
                    { value: 'Executive Producer', label: 'Executive Producer', group: 'Production', description: 'Oversees financing, resources, and global decisions' },
                    { value: 'Producer', label: 'Producer', group: 'Production', description: 'Coordinates the entire production process' },
                    { value: 'Production Manager', label: 'Production Manager', group: 'Production', description: 'Manages logistics, schedules, and crew' },
                    { value: 'Production Assistant / Runner', label: 'Production Assistant / Runner', group: 'Production', description: 'Provides support and coordination on set' },
                    { value: 'First AD', label: 'First AD (Assistant Director)', group: 'Production', description: 'Coordinates daily shooting schedule and set flow' },
                    { value: 'Location Manager', label: 'Location Manager', group: 'Production', description: 'Scouts, secures, and manages filming locations' },
                    { value: 'Booker / Talent Manager', label: 'Booker / Talent Manager', group: 'Production', description: 'Manages casting and actor logistics' },
                    { value: 'Casting Director', label: 'Casting Director', group: 'Production', description: 'Oversees talent selection and casting' },
                    { value: 'Production Coordinator', label: 'Production Coordinator', group: 'Production', description: 'Manages documents, permits, and production follow-up' },
                    { value: 'Production Supervisor', label: 'Production Supervisor', group: 'Production', description: 'Oversees multiple units or complex logistics' },
                    { value: 'Catering', label: 'Catering', group: 'Production', description: 'Provides food and service for the crew' },
                    { value: 'Material Renting / Equipment Manager', label: 'Material Renting / Equipment Manager', group: 'Production', description: 'Handles rentals and technical equipment' },
                    { value: 'Home Economist', label: 'Home Economist', group: 'Production', description: 'Prepares food and props for camera setups' },

                    // --- Direction & Writing ---
                    { value: 'Director', label: 'Director', group: 'Direction', description: 'Leads the creative vision of the project' },
                    { value: 'Creative Director', label: 'Creative Director', group: 'Direction', description: 'Defines the artistic direction and brand coherence' },
                    { value: 'Filmmaker', label: 'Filmmaker', group: 'Direction', description: 'Multi-skilled creator (shoots, directs, edits)' },
                    { value: 'Scriptwriter / Copywriter', label: 'Scriptwriter / Copywriter', group: 'Direction', description: 'Writes scripts, dialogues, and storytelling concepts' },

                    // --- Art Department ---
                    { value: 'Production Designer', label: 'Production Designer', group: 'Art Department', description: 'Defines the visual identity of the production' },
                    { value: 'Art Director', label: 'Art Director', group: 'Art Department', description: 'Supervises set design, props, and decoration' },
                    { value: 'Set Designer', label: 'Set Designer', group: 'Art Department', description: 'Designs and plans the construction of sets' },
                    { value: 'Stylist', label: 'Stylist', group: 'Art Department', description: 'Manages wardrobe and fashion styling' },
                    { value: 'Make Up Artist', label: 'Make Up Artist', group: 'Art Department', description: 'Handles makeup, hair, and special effects makeup' },
                    { value: 'Illustrator', label: 'Illustrator', group: 'Art Department', description: 'Creates visuals, storyboards, and concept art' },

                    // --- Camera & Lighting ---
                    { value: 'DOP', label: 'DOP (Director of Photography)', group: 'Camera & Lighting', description: 'Responsible for lighting, framing, and visual tone' },
                    { value: 'Camera Operator', label: 'Camera Operator', group: 'Camera & Lighting', description: 'Operates the main or secondary camera' },
                    { value: 'Camera Assistant', label: 'Camera Assistant (AC)', group: 'Camera & Lighting', description: 'Supports DOP, focus pulling, and camera prep' },
                    { value: 'Drone Operator', label: 'Drone Operator', group: 'Camera & Lighting', description: 'Operates aerial drones for filming' },
                    { value: 'Photographer', label: 'Photographer', group: 'Camera & Lighting', description: 'Takes promotional or BTS photos' },
                    { value: 'BTS Videographer', label: 'BTS Videographer', group: 'Camera & Lighting', description: 'Films behind-the-scenes content' },
                    { value: 'Gaffer', label: 'Gaffer', group: 'Camera & Lighting', description: 'Head electrician managing light setups' },
                    { value: 'Best Boy', label: 'Best Boy', group: 'Camera & Lighting', description: 'Gaffer’s assistant managing cables and gear' },
                    { value: 'Grip', label: 'Grip', group: 'Camera & Lighting', description: 'Sets rigging, supports, and movement systems' },

                    // --- Sound ---
                    { value: 'Sound Designer', label: 'Sound Designer / Recordist', group: 'Sound', description: 'Records, edits, and mixes sound' },
                    { value: 'Boom Operator', label: 'Boom Operator', group: 'Sound', description: 'Operates the boom mic and captures clean dialogue' },
                    { value: 'Sound Mixer', label: 'Sound Mixer', group: 'Sound', description: 'Balances audio levels during recording' },

                    // --- Post-production & VFX ---
                    { value: 'Video Editor', label: 'Video Editor', group: 'Post-production', description: 'Edits footage into a coherent final cut' },
                    { value: 'Colorist', label: 'Colorist', group: 'Post-production', description: 'Performs color grading and look adjustments' },
                    { value: 'VFX Artist', label: 'VFX Artist', group: 'Post-production', description: 'Creates and integrates visual effects' },
                    { value: 'Compositor', label: 'Compositor', group: 'Post-production', description: 'Integrates layers and visual effects into final shots' },
                    { value: 'Post Supervisor', label: 'Post Supervisor', group: 'Post-production', description: 'Oversees the full post-production workflow' },
                    { value: 'Clean Up Artist', label: 'Clean Up Artist', group: 'Post-production', description: 'Finalizes frames and removes artifacts' },
                    { value: '3D Artist', label: '3D Artist', group: 'Post-production', description: 'Builds and renders 3D models and scenes' },
                    { value: 'Motion Designer', label: 'Motion Designer / Animator', group: 'Post-production', description: 'Creates motion graphics and animated sequences' },
                    { value: 'Data Wrangler / DIT', label: 'Data Wrangler / DIT', group: 'Post-production', description: 'Manages digital footage and data workflow' },

                    // --- Design & Marketing ---
                    { value: 'Graphic Designer', label: 'Graphic Designer', group: 'Design & Marketing', description: 'Creates visual assets and graphic materials' },
                    { value: 'UI/UX Motion Designer', label: 'UI/UX Motion Designer', group: 'Design & Marketing', description: 'Animates and designs digital interfaces' },
                    { value: 'Marketing Manager', label: 'Marketing Manager', group: 'Design & Marketing', description: 'Promotes productions and content' },
                    { value: 'Social Media Manager', label: 'Social Media Manager', group: 'Design & Marketing', description: 'Manages content and strategy on social platforms' },
                    { value: 'Content Strategist', label: 'Content Strategist', group: 'Design & Marketing', description: 'Develops creative and communication strategy' },

                    // --- Technical & Management ---
                    { value: 'Project Manager', label: 'Project Manager', group: 'Technical & Management', description: 'Oversees project delivery and team workflow' },
                    { value: 'Account Manager', label: 'Account Manager', group: 'Technical & Management', description: 'Maintains client communication and feedback' },
                    { value: 'Operations Manager', label: 'Operations Manager', group: 'Technical & Management', description: 'Coordinates departments and resources' },
                    { value: 'Communication Specialist', label: 'Communication Specialist', group: 'Technical & Management', description: 'Internal and external communication' },
                    { value: 'Streaming Operator', label: 'Streaming Operator', group: 'Technical & Management', description: 'Handles live broadcast and streaming systems' },
                    { value: 'IT Specialist', label: 'IT Specialist', group: 'Technical & Management', description: 'Handles networking, data storage, and systems' },
                    { value: 'Software Developer', label: 'Software Developer', group: 'Technical & Management', description: 'Builds internal tools and automations' },
                    { value: 'AI Engineer', label: 'AI Engineer / Technical Artist', group: 'Technical & Management', description: 'Develops or applies AI-based tools' },
                    { value: 'AI Artist', label: 'AI Artist', group: 'Technical & Management', description: 'Generates content using AI tools and workflows' },

                    // --- Other ---
                    { value: 'Other', label: 'Other', group: 'General', description: 'Undefined or custom role' }
                ]
            },
            { slug: 'comments', name: 'Comments', fieldType: 'text' },
            { slug: 'preferred_platform', name: 'Preferred Platform', fieldType: 'array', defaultOptions: ['Instagram','Tiktok','Linkedin','Youtube','X','Twitter','Facebook'] },

            // --- Motivation & Financial ---
            { slug: 'motivation', name: 'Motivation', fieldType: 'text' },
            { slug: 'self_worker', name: 'Self Worker', fieldType: 'boolean' },
            { slug: 'rate_range', name: 'Rate Range', fieldType: 'number' }, 

            // --- Physical Traits & Equipment ---
            // { slug: 'traits', name: 'Traits', fieldType: 'select' },
            {
                slug: 'eyes_color',
                name: 'Eyes Color',
                fieldType: 'select',
                defaultOptions: [
                    { value: 'Amber', label: 'Amber' },
                    { value: 'Black', label: 'Black' },
                    { value: 'Blue', label: 'Blue' },
                    { value: 'Blonde', label: 'Blonde' }, // Rare, but in your list
                    { value: 'Brown', label: 'Brown' },
                    { value: 'Dark Brown', label: 'Dark Brown' },
                    { value: 'Grey', label: 'Grey' },
                    { value: 'Green', label: 'Green' },
                    { value: 'Hazel', label: 'Hazel' },
                    { value: 'Honey Brown', label: 'Honey Brown' },
                    { value: 'Light Blue', label: 'Light Blue' },
                    { value: 'Light Brown', label: 'Light Brown' },
                    { value: 'Olive', label: 'Olive' },
                    { value: 'Red', label: 'Red' },
                    { value: 'Turquoise', label: 'Turquoise' },
                    { value: 'Violet', label: 'Violet' }
                ]
            },
            {
                slug: 'hair_color',
                name: 'Hair Color',
                fieldType: 'select',
                defaultOptions: [
                    // --- Natural Shades ---
                    { value: 'Black', label: 'Black', group: 'Natural Shades' },
                    { value: 'Dark Brown', label: 'Dark Brown', group: 'Natural Shades' },
                    { value: 'Brown', label: 'Brown', group: 'Natural Shades' },
                    { value: 'Light Brown', label: 'Light Brown', group: 'Natural Shades' },
                    { value: 'Chestnut', label: 'Chestnut', group: 'Natural Shades' },
                    { value: 'Auburn', label: 'Auburn', group: 'Natural Shades' }, // Added standard Auburn if Copper/Red aren't enough
                    { value: 'Copper', label: 'Copper', group: 'Natural Shades' },
                    { value: 'Red', label: 'Red', group: 'Natural Shades' },
                    { value: 'Ginger', label: 'Ginger', group: 'Natural Shades' },
                    { value: 'Dark Blonde', label: 'Dark Blonde', group: 'Natural Shades' },
                    { value: 'Blonde', label: 'Blonde', group: 'Natural Shades' },
                    { value: 'Honey Blonde', label: 'Honey Blonde', group: 'Natural Shades' },
                    { value: 'Light Blonde', label: 'Light Blonde', group: 'Natural Shades' },
                    { value: 'Grey', label: 'Grey', group: 'Natural Shades' },
                    { value: 'White', label: 'White', group: 'Natural Shades' },
                    { value: 'Pink', label: 'Pink', group: 'Vibrant/Dyed' },
                    { value: 'Purple', label: 'Purple', group: 'Vibrant/Dyed' },
                    { value: 'Blue', label: 'Blue', group: 'Vibrant/Dyed' },
                    { value: 'Green', label: 'Green', group: 'Vibrant/Dyed' },
                    { value: 'Orange', label: 'Orange', group: 'Vibrant/Dyed' }
                ]
            },
            {
                slug: 'hair_type',
                name: 'Hair Type',
                fieldType: 'select', // Could also be 'array' if you want them to select Texture AND Length
                defaultOptions: [
                    // --- Texture & Density ---
                    { value: 'Straight', label: 'Straight', group: 'Texture & Density' },
                    { value: 'Fine Straight', label: 'Fine Straight', group: 'Texture & Density' },
                    { value: 'Wavy', label: 'Wavy', group: 'Texture & Density' },
                    { value: 'Curly', label: 'Curly', group: 'Texture & Density' },
                    { value: 'Afro', label: 'Afro (Coily)', group: 'Texture & Density' },
                    { value: 'Thick', label: 'Thick', group: 'Texture & Density' },

                    // --- Length ---
                    { value: 'Bald', label: 'Bald / Shaved', group: 'Length' },
                    { value: 'Buzzcut', label: 'Buzzcut', group: 'Length' },
                    { value: 'Short', label: 'Short', group: 'Length' },
                    { value: 'Short/Medium', label: 'Short/Medium', group: 'Length' },
                    { value: 'Medium', label: 'Medium', group: 'Length' },
                    { value: 'Long', label: 'Long', group: 'Length' },

                    // --- Style/Cut ---
                    { value: 'Bob Cut', label: 'Bob Cut', group: 'Style' },
                    { value: 'Layered', label: 'Layered', group: 'Style' },
                    { value: 'Butterfly Cut', label: 'Butterfly Cut', group: 'Style' },
                    { value: 'Braids', label: 'Braids', group: 'Style' },
                    { value: 'Ponytail', label: 'Ponytail', group: 'Style' }
                ]
            },
            {
                slug: 'skin_color',
                name: 'Skin Color',
                fieldType: 'select',
                defaultOptions: [
                    { value: 'Fair', label: 'Fair', description: 'Very light complexion' },
                    { value: 'Pale', label: 'Pale', description: 'Light tone with low pigmentation' },
                    { value: 'Light', label: 'Light', description: 'Light beige tone' },
                    { value: 'Light Brown', label: 'Light Brown', description: 'Between light and medium tone' },
                    { value: 'Medium', label: 'Medium', description: 'Neutral mid-tone' },
                    { value: 'Tan', label: 'Tan', description: 'Lightly sun-tanned tone' },
                    { value: 'Olive', label: 'Olive', description: 'Greenish or golden undertone' },
                    { value: 'Bronze', label: 'Bronze', description: 'Warm medium-deep tone' },
                    { value: 'Brown', label: 'Brown', description: 'Medium-deep tone' },
                    { value: 'Dark Brown', label: 'Dark Brown', description: 'Deep brown tone' },
                    { value: 'Deep', label: 'Deep', description: 'Very dark tone' }
                ]
            },
            { slug: 'height', name: 'Height', fieldType: 'number' }, // Changed to number for numerical validation
            { slug: 'tshirt_size', name: 'T-shirt Size', fieldType: 'select', defaultOptions: [
                    { value: 'XS', label: 'XS - Extra Small', description: 'EU 42–44 (Men) / EU 34–36 (Women)' },
                    { value: 'S', label: 'S - Small', description: 'EU 46 (Men) / EU 36–38 (Women)' },
                    { value: 'M', label: 'M - Medium', description: 'EU 48 (Men) / EU 38–40 (Women)' },
                    { value: 'L', label: 'L - Large', description: 'EU 50 (Men) / EU 40–42 (Women)' },
                    { value: 'XL', label: 'XL - Extra Large', description: 'EU 52 (Men) / EU 44–46 (Women)' },
                    { value: 'XXL', label: 'XXL - Double Extra Large', description: 'EU 54 (Men) / EU 48–50 (Women)' },
                    { value: '3XL', label: '3XL - Triple Extra Large', description: 'EU 56–58' },
                    { value: '4XL', label: '4XL - Quadruple Extra Large', description: 'EU 60–62' }]},
            { slug: 'jean_size', name: 'Jean Size', fieldType: 'select', defaultOptions:['34 - 26" Very Small','36 - 28" Small','38 - 30" Medium','40 - 32" Medium/Large','42- 34" Large','44 - 36" XL','46 - 38" XXL','48 - 40" 3XL','48	- 40" 3XL','50 - 42" 4XL','52 - 44" 5XL'] },
            { slug: 'shoe_size', name: 'Shoe Size', fieldType: 'select', defaultOptions:['35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50']}, // Changed to number

             // --- Equipment ---
            { slug: 'voice_over', name: 'Voice Over', fieldType: 'boolean' },
            { 
                slug: 'categories', 
                name: 'Content Categories', 
                fieldType: 'array', 
                defaultOptions: [
                    // --- Group: Creative & Arts ---
                    { value: 'Art & Design', label: 'Art & Design', group: 'Creative & Arts', description: 'Illustration, photography, painting, visual arts' },
                    { value: 'Dance', label: 'Dance', group: 'Creative & Arts', description: 'Performances, training, trends' },
                    { value: 'Music', label: 'Music', group: 'Creative & Arts', description: 'Instruments, concerts, playlists' },
                    { value: 'Photography', label: 'Photography', group: 'Creative & Arts', description: 'Camera work, editing, visual storytelling' },
                    { value: 'Entertainment', label: 'Entertainment', group: 'Creative & Arts', description: 'Movies, TV shows, celebrity culture' },

                    // --- Group: Lifestyle & Personal ---
                    { value: 'Accessories', label: 'Accessories', group: 'Lifestyle', description: 'Fashion accessories, jewelry, add-ons' },
                    { value: 'Beauty', label: 'Beauty', group: 'Lifestyle', description: 'Makeup, skincare, cosmetic products' },
                    { value: 'Fashion', label: 'Fashion', group: 'Lifestyle', description: 'Clothing, styling, trends' },
                    { value: 'Lifestyle', label: 'Lifestyle', group: 'Lifestyle', description: 'Daily habits, inspiration, personal life' },
                    { value: 'Pets & Animals', label: 'Pets & Animals', group: 'Lifestyle', description: 'Animal care, training, pet lifestyle' },
                    { value: 'Travel', label: 'Travel', group: 'Lifestyle', description: 'Destinations, adventures, travel tips' },

                    // --- Group: Health & Home ---
                    { value: 'Health & Wellness', label: 'Health & Wellness', group: 'Health & Home', description: 'Physical and mental well-being' },
                    { value: 'Fitness & Gym', label: 'Fitness & Gym', group: 'Health & Home', description: 'Workouts, routines, personal training' },
                    { value: 'Home & Interior', label: 'Home & Interior', group: 'Health & Home', description: 'Decoration, architecture, design ideas' },
                    { value: 'Parenting & Family', label: 'Parenting & Family', group: 'Health & Home', description: 'Family life, childcare, parenting advice' },
                    { value: 'Psychology', label: 'Psychology', group: 'Health & Home', description: 'Emotional balance, therapy, human behavior' },

                    // --- Group: Activities & Skills ---
                    { value: 'Cooking & Food', label: 'Cooking & Food', group: 'Activities & Skills', description: 'Recipes, gastronomy, culinary arts' },
                    { value: 'DIY & Crafts', label: 'DIY & Crafts', group: 'Activities & Skills', description: 'Handmade, upcycling, creative projects' },
                    { value: 'Gaming', label: 'Gaming', group: 'Activities & Skills', description: 'Video games, streaming, e-sports' },
                    { value: 'Camping', label: 'Camping', group: 'Activities & Skills', description: 'Outdoor camping lifestyle and equipment' },
                    { value: 'Hiking & Outdoors', label: 'Hiking & Outdoors', group: 'Activities & Skills', description: 'Nature exploration, trails, adventure' },
                    { value: 'Sports', label: 'Sports', group: 'Activities & Skills', description: 'General athletic activities and competitions' },

                    // --- Group: Knowledge & Business ---
                    { value: 'Business & Finance', label: 'Business & Finance', group: 'Knowledge', description: 'Entrepreneurship, economy, marketing' },
                    { value: 'Education', label: 'Education', group: 'Knowledge', description: 'Learning, online courses, personal growth' },
                    { value: 'Books & Literature', label: 'Books & Literature', group: 'Knowledge', description: 'Reading, writing, literary culture' },
                    { value: 'Science & Technology', label: 'Science & Technology', group: 'Knowledge', description: 'Gadgets, innovation, AI, discoveries' },
                    { value: 'Sustainability', label: 'Sustainability', group: 'Knowledge', description: 'Eco-lifestyle, recycling, conscious living' }
                ]
            },
            { slug: 'driving_license', name: 'Driving License', fieldType: 'array', defaultOptions:['AM','A1','A2','A','B1','B','C1','C','D1','D','BE','C1E','CE','D1E','DE' ] },
            { slug: 'vehicle', name: 'Vehicle', fieldType: 'boolean' },
            { slug: 'equipment', name: 'Equipment', fieldType: 'boolean' },
            { slug: 'portfolio_gallery', name: 'Portfolio Gallery', fieldType: 'image_array', description: 'Collection of work samples, headshots, or relevant project images.'}
           
        ];
        await AttributeDefinition.insertMany(attributes);
        console.log(`✨ Seeded ${attributes.length} global Attribute Definitions.`);
    }
};

const seedUserTypeConfigs = async () => {
    if (await UserTypeConfig.countDocuments() === 0) {
        const userTypes = [
            {
                slug: 'ugc-creator',
                name: 'UGC Content Creator',
                parentType: 'Collaborator',
                fields: [
                    // Personal Details
                    { attributeSlug: 'gender', label: 'Gender', required: false, section: 'Personal Details' },
                    { attributeSlug: 'nationality', label: 'Nationality', required: true, section: 'Personal Details' },
                    { attributeSlug: 'year_of_birth', label: 'Year of Birth', required: true, section: 'Personal Details' },
                    { attributeSlug: 'native_language', label: 'Native Language', required: true, section: 'Personal Details' },
                    { attributeSlug: 'other_languages', label: 'Other Languages', required: false, section: 'Personal Details' },
                    { attributeSlug: 'comments', label: 'Comments', required: false, section: 'Personal Details' },   
                    
                    // Social & Portfolio Links
                    { attributeSlug: 'instagram', label: 'Instagram Profile', required: true, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'tiktok', label: 'TikTok Profile', required: true, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'portfolio_link', label: 'Work Portfolio', required: false, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'website', label: 'Personal Website', required: false, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'portfolio_gallery', label: 'Content Showcase (Images)', required: false, section: 'Social & Portfolio Links' },
                    
                    // Motivation & Financial
                    { attributeSlug: 'rate_range', label: 'Expected Rate Range (€)', required: false, section: 'Motivation & Financial' },
                    { attributeSlug: 'motivation', label: 'Motivation Summary', required: false, section: 'Motivation & Financial' },
                    { attributeSlug: 'self_worker', label: 'Self Worker Status', required: false, section: 'Motivation & Financial' },

                    // Physical Traits
                    { attributeSlug: 'eyes_color', label: 'Eyes Color', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'hair_color', label: 'Hair Color', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'hair_type', label: 'Hair Type', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'skin_color', label: 'Skin Color', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'height', label: 'Height (cm)', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'tshirt_size', label: 'T-shirt Size', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'jean_size', label: 'Jean Size', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'shoe_size', label: 'Shoe Size', required: false, section: 'Physical Traits' },
                   

                    // Equipment & Skills
                    { attributeSlug: 'preferred_platform', label: 'Preferred Platform(s)', required: false, section: 'Equipment' },
                    { attributeSlug: 'categories', label: 'Content Categories', required: false, section: 'Equipment' },
                    { attributeSlug: 'voice_over', label: 'Voice Over Capability', required: false, section: 'Equipment' },
                    { attributeSlug: 'driving_license', label: 'Driving License', required: false, section: 'Equipment' },
                    { attributeSlug: 'vehicle', label: 'Own Vehicle', required: false, section: 'Equipment' },
                    { attributeSlug: 'equipment', label: 'Own Equipment', required: false, section: 'Equipment' },

                    // Internal
                    { attributeSlug: 'source', label: 'Referral Source', required: false, section: 'Linkvids Internal' },
                    { attributeSlug: 'worked_with_linkvids', label: 'Worked with Linkvids Before', required: false, section: 'Linkvids Internal' },
                    { attributeSlug: 'admin_comments', label: 'Admin Comments', required: false, section: 'Linkvids Internal' },
                ]
            },
            {
                slug: 'actor',
                name: 'Actor / Model',
                parentType: 'Collaborator',
                fields: [
                    // Personal Details
                
                    { attributeSlug: 'gender', label: 'Gender', required: false, section: 'Personal Details' },
                    { attributeSlug: 'nationality', label: 'Nationality', required: true, section: 'Personal Details' },
                    { attributeSlug: 'year_of_birth', label: 'Year of Birth', required: true, section: 'Personal Details' },
                    { attributeSlug: 'native_language', label: 'Native Language', required: true, section: 'Personal Details' },
                    { attributeSlug: 'other_languages', label: 'Other Languages', required: false, section: 'Personal Details' },
                    { attributeSlug: 'comments', label: 'Comments', required: false, section: 'Personal Details' },   

                    // Social & Portfolio Links
                    { attributeSlug: 'instagram', label: 'Instagram Profile', required: true, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'tiktok', label: 'TikTok Profile', required: true, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'portfolio_link', label: 'Work Portfolio', required: false, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'website', label: 'Personal Website', required: false, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'other_links', label: 'Other Links', required: false, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'portfolio_gallery', label: 'Content Showcase (Images)', required: false, section: 'Social & Portfolio Links' },
                    
                    // Motivation & Financial
                    { attributeSlug: 'rate_range', label: 'Expected Rate Range (€)', required: false, section: 'Motivation & Financial' },
                    { attributeSlug: 'motivation', label: 'Motivation Summary', required: false, section: 'Motivation & Financial' },
                    { attributeSlug: 'self_worker', label: 'Self Worker Status', required: false, section: 'Motivation & Financial' },

                    // Physical Traits
                    { attributeSlug: 'eyes_color', label: 'Eyes Color', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'hair_color', label: 'Hair Color', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'hair_type', label: 'Hair Type', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'skin_color', label: 'Skin Color', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'height', label: 'Height (cm)', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'tshirt_size', label: 'T-shirt Size', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'jean_size', label: 'Jean Size', required: false, section: 'Physical Traits' },
                    { attributeSlug: 'shoe_size', label: 'Shoe Size', required: false, section: 'Physical Traits' },
                   

                    // Equipment & Skills
                    { attributeSlug: 'voice_over', label: 'Voice Over Capability', required: false, section: 'Equipment' },
                   
                    // Internal
                    { attributeSlug: 'source', label: 'Referral Source', required: false, section: 'Linkvids Internal' },
                    { attributeSlug: 'worked_with_linkvids', label: 'Worked with Linkvids Before', required: false, section: 'Linkvids Internal' },
                    { attributeSlug: 'work_in_bcn', label: 'Work in BCN', required: false, section: 'Linkvids Internal' },
                    { attributeSlug: 'admin_comments', label: 'Admin Comments', required: false, section: 'Linkvids Internal' },
                ]
            },
            {
                slug: 'freelancer-outsource',
                name: 'Freelancer / Outsource',
                parentType: 'Collaborator',
                fields: [
                    // --- Personal Details ---
                    { attributeSlug: 'gender', label: 'Gender', required: false, section: 'Personal Details' },
                    { attributeSlug: 'nationality', label: 'Nationality', required: true, section: 'Personal Details' },
                    { attributeSlug: 'year_of_birth', label: 'Year of Birth', required: true, section: 'Personal Details' },
                    { attributeSlug: 'native_language', label: 'Native Language', required: true, section: 'Personal Details' },
                    { attributeSlug: 'other_languages', label: 'Other Languages', required: false, section: 'Personal Details' },
                    { attributeSlug: 'comments', label: 'Comments', required: false, section: 'Personal Details' },   

                    // --- Social & Portfolio Links (Crucial for demonstrating professional work) ---
                    { attributeSlug: 'portfolio_link', label: 'Work Portfolio Link', required: true, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'website', label: 'Personal Website / LinkedIn', required: true, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'instagram', label: 'Instagram Profile', required: false, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'tiktok', label: 'TikTok Profile', required: false, section: 'Social & Portfolio Links' },
                    { attributeSlug: 'portfolio_gallery', label: 'Content Showcase (Images)', required: false, section: 'Social & Portfolio Links' },
                    
                    // --- Motivation & Financial ---
                    { attributeSlug: 'rate_range', label: 'Expected Rate Range (€/hr/day)', required: true, section: 'Motivation & Financial' },
                    { attributeSlug: 'motivation', label: 'Motivation Summary', required: false, section: 'Motivation & Financial' },
                    { attributeSlug: 'self_worker', label: 'Self Worker Status', required: false, section: 'Motivation & Financial' },

                    // --- Equipment & Skills (Core professional details) ---
                    { attributeSlug: 'categories', label: 'Professional Categories (Skills)', required: true, section: 'Equipment' },
                    { attributeSlug: 'voice_over', label: 'Voice Over Capability', required: false, section: 'Equipment' },
                    { attributeSlug: 'driving_license', label: 'Driving License', required: false, section: 'Equipment' },
                    { attributeSlug: 'vehicle', label: 'Own Vehicle', required: false, section: 'Equipment' },
                    { attributeSlug: 'equipment', label: 'Own Professional Equipment', required: true, section: 'Equipment' },
                    
                    // --- Internal/Location Flags ---
                    { attributeSlug: 'work_in_bcn', label: 'Available to Work in BCN', required: false, section: 'Linkvids Internal' },
                    { attributeSlug: 'source', label: 'Referral Source', required: false, section: 'Linkvids Internal' },
                    { attributeSlug: 'worked_with_linkvids', label: 'Worked with Linkvids Before', required: false, section: 'Linkvids Internal' },
                    { attributeSlug: 'admin_comments', label: 'Admin Comments', required: false, section: 'Linkvids Internal' },
                    { attributeSlug: 'areas', label: 'Areas', required: false, section: 'Linkvids Internal' },
                ]
            },
            // Initial Agency/Brand type
             {
                slug: 'brand-agency', name: 'Brand / Agency', parentType: 'Agency',
                fields: [
                    { attributeSlug: 'portfolioUrl', label: 'Company Website', required: true, section: 'Contact' },
                ]
            },
        ];
        await UserTypeConfig.insertMany(userTypes);
        console.log(`✨ Seeded ${userTypes.length} User Type Configurations.`);
    }
};

module.exports = connectDB;