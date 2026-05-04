import mongoose from 'mongoose';

const guildConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  aiConfig: {
    baseUrl: {
      type: String,
      default: process.env.DEFAULT_AI_BASE_URL,
    },
    model: {
      type: String,
      default: process.env.DEFAULT_AI_MODEL,
    },
    apiKey: {
      type: String,
      default: process.env.DEFAULT_AI_API_KEY,
    },
    personality: {
      type: String,
      default: 'You are a helpful and friendly Discord bot assistant.',
    },
    responseChance: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    cooldown: {
      type: Number,
      default: 3000,
    },
    allowedChannels: {
      type: [String],
      default: [],
    },
  },
  moderation: {
    enabled: {
      type: Boolean,
      default: true,
    },
    toxicityThreshold: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1,
    },
    autoModActions: {
      warn: { type: Boolean, default: true },
      mute: { type: Boolean, default: false },
      kick: { type: Boolean, default: false },
      ban: { type: Boolean, default: false },
    },
    logChannelId: {
      type: String,
      default: null,
    },
  },
  verification: {
    enabled: {
      type: Boolean,
      default: false,
    },
    roleId: {
      type: String,
      default: null,
    },
    channelId: {
      type: String,
      default: null,
    },
    method: {
      type: String,
      enum: ['button', 'command', 'captcha'],
      default: 'button',
    },
  },
  welcome: {
    enabled: {
      type: Boolean,
      default: false,
    },
    channelId: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      default: 'Welcome {user} to {server}!',
    },
    useEmbed: {
      type: Boolean,
      default: true,
    },
  },
  whitelistEnabled: {
    type: Boolean,
    default: false,
  },
  whitelistUserIds: {
    type: [String],
    default: [],
  },
  whitelistRoleIds: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

guildConfigSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('GuildConfig', guildConfigSchema);
