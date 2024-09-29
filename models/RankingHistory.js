import mongoose from 'mongoose';

const RankingHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: String, required: true },
  rankings: [{ type: String }],
  date: { type: Date, default: Date.now },
});

export default mongoose.models.RankingHistory || mongoose.model('RankingHistory', RankingHistorySchema);