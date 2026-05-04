import mongoose from 'mongoose';

const moderationLogSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
  },
  moderatorId: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    enum: ['warn', 'mute', 'kick', 'ban', 'unmute', 'unban'],
    required: true,
  },
  reason: {
    type: String,
    default: 'No reason provided',
  },
  duration: {
    type: Number,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('ModerationLog', moderationLogSchema);
