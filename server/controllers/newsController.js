// server/controllers/newsController.js
const News = require('../models/News');

// --- PUBLIC / USER VIEW (Published Only) ---
exports.getNewsFeed = async (req, res) => {
    try {
        // Check if a limit is provided in the query string
        const limit = parseInt(req.query.limit) || 0; 

        let query = News.find({ status: 'Published' })
            .sort({ createdAt: -1 }) // Newest first
            .select('-__v'); // Exclude version key

        // Apply limit if valid
        if (limit > 0) {
            query = query.limit(limit);
        }

        const news = await query.exec();
        res.json(news);
    } catch (err) {
        console.error("News Feed Error:", err);
        res.status(500).json({ message: 'Failed to fetch news.' });
    }
};

// --- ADMIN VIEW (All Items) ---
exports.getAllNewsAdmin = async (req, res) => {
    try {
        const news = await News.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name');
        res.json(news);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch news list.' });
    }
};

// --- GET SINGLE (Detail) ---
exports.getNewsById = async (req, res) => {
    try {
        const item = await News.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'News item not found.' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching news item.' });
    }
};

// --- CREATE ---
exports.createNews = async (req, res) => {
    try {
        const { title, excerpt, content, image, status, linkUrl, } = req.body;
        
        const newNews = await News.create({
            title,
            excerpt,
            content,
            image,
            status: status || 'Draft',
            linkUrl,
            createdBy: req.user // From JWT
        });

        res.status(201).json({ message: 'News created successfully.', news: newNews });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create news.' });
    }
};

// --- UPDATE ---
exports.updateNews = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedNews = await News.findByIdAndUpdate(id, req.body, { new: true });
        
        if (!updatedNews) return res.status(404).json({ message: 'News item not found.' });
        
        res.json({ message: 'News updated.', news: updatedNews });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update news.' });
    }
};

// --- DELETE ---
exports.deleteNews = async (req, res) => {
    try {
        await News.findByIdAndDelete(req.params.id);
        res.json({ message: 'News deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete news.' });
    }
};