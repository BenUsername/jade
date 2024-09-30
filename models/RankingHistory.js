const mongoose = require('mongoose');

const RankingHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  domain: { type: String, required: true },
  userDescription: { type: String, required: true },
  service: { type: String, required: true },
  rankings: { type: [String], required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RankingHistory', RankingHistorySchema);