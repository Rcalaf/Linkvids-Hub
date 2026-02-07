const SavedFilter = require('../models/SavedFilter');

exports.saveFilter = async (req, res) => {
    try {
        const { name, filters, context } = req.body;
        
        // Update if exists, or create new (Upsert logic)
        const saved = await SavedFilter.findOneAndUpdate(
            { user: req.user._id, name, context },
            { filters },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(201).json(saved);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getMyFilters = async (req, res) => {
    try {
        const { context } = req.query;
        const filters = await SavedFilter.find({ 
            user: req.user._id,
            context: context || 'collaborators' 
        }).sort({ name: 1 });
        
        res.json(filters);
    } catch (error) {
        res.status(500).json({ message: 'Failed to load filters' });
    }
};

exports.deleteFilter = async (req, res) => {
    try {
        await SavedFilter.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        res.json({ message: 'Filter deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete filter' });
    }
};