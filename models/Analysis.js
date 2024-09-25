const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  brand: String,
  analysis: Object,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);