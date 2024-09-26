const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  brand: String,
  industry: String,
  analysis: String,
  userId: String,
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);