const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'analysis',
    required: true
  },
  brand: String,
  industry: String,
  analysis: String,
  userId: String,
}, { timestamps: true });

module.exports = mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);