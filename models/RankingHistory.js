const mongoose = require('mongoose');

const RankingHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brand: { type: String, required: true }, // Add this line
  service: { type: String, required: true },
  rankings: { type: [String], required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RankingHistory', RankingHistorySchema);