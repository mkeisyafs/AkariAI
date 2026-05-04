import mongoose from 'mongoose';

const userWarningSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
  },
  warnings: [{
    moderatorId: String,
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
});

userWarningSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export default mongoose.model('UserWarning', userWarningSchema);
