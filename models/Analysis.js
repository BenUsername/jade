const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  brands: [String],
  analysis: {
    brands: [String],
    brandMentions: Object,
    llmResponse: String,
  },
  userId: String,
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);