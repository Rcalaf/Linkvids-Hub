const BaseUser = require('../models/BaseUser');

// NOTE: Permissions are now handled by verifyOwnership middleware!

// GET /api/financial/:userId
exports.getFinancialProfile = async (req, res) => {
    try {
        const user = await BaseUser.findById(req.params.userId).select('financial_profile');
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        res.json(user.financial_profile || {});
    } catch (error) {
        res.status(500).json({ message: 'Error fetching financial data', error: error.message });
    }
};

// PUT /api/financial/:userId
exports.updateFinancialProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const financialData = req.body;

        const user = await BaseUser.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.financial_profile = financialData;
        await user.save();

        res.json({ message: 'Financial profile updated successfully', data: user.financial_profile });
    } catch (error) {
        console.error("Financial Update Error:", error);
        res.status(400).json({ message: 'Validation failed', error: error.message });
    }
};

// DELETE /api/financial/:userId
exports.deleteFinancialProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await BaseUser.findById(userId);
        
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.financial_profile = undefined; // Remove the subdocument
        await user.save();

        res.json({ message: 'Financial data deleted successfully.' });
    } catch (error) {
        console.error("Financial Delete Error:", error);
        res.status(500).json({ message: 'Failed to delete financial data.' });
    }
};