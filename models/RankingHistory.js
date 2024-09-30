import mongoose from 'mongoose';

const RankingHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  domain: { type: String, required: true },
  service: { type: String, required: true },
  rankings: { type: [String], required: true },
  keywordPrompts: { type: [String], required: true },
  date: { type: Date, default: Date.now },
  // Either remove this line completely if you don't need userDescription anymore
  // or make it optional like this:
  userDescription: { type: String, required: false },
});

export default mongoose.models.RankingHistory || mongoose.model('RankingHistory', RankingHistorySchema);