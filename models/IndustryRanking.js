// models/IndustryRanking.js

const mongoose = require('mongoose');

const IndustryRankingSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'ranking',
    required: true
  },
  industry: String,
  rankings: [{
    brand: String,
    rank: Number
  }],
  userId: String,
}, { timestamps: true });  // This adds createdAt and updatedAt fields

module.exports = mongoose.models.IndustryRanking || mongoose.model('IndustryRanking', IndustryRankingSchema);
