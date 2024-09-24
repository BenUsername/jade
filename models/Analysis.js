const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  analysis: { type: Object, required: true },
  date: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

module.exports = mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);