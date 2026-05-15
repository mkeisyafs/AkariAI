import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from 'discord.js';
import reactionRoleRepository from '../../database/repositories/reactionRoleRepository.js';

const CUSTOM_EMOJI_RE = /^<a?:\w+:(\d+)>$/;

function parseEmoji(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m = trimmed.match(CUSTOM_EMOJI_RE);
  if (m) return { storage: m[1], reactWith: trimmed };
  return { storage: trimmed, reactWith: trimmed };
}

async function ensureMemberCanManageRole(interaction, role) {
  const me = await interaction.guild.members.fetchMe();
  if (role.managed) return 'That role is managed by an integration and cannot be assigned.';
  if (role.id === interaction.guild.id) return 'You cannot bind @everyone.';
  if (me.roles.highest.comparePositionTo(role) <= 0) {
    return `My highest role must be above ${role.name} for me to assign it.`;
  }
  return null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('reactrole')
    .setDescription('Manage reaction roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Post a new reaction-role message in a channel')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Channel to post the message in')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('title').setDescription('Embed title').setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('description')
            .setDescription('Embed description (shown above the reactions)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Bind an emoji to a role on an existing reaction-role message')
        .addStringOption((o) =>
          o
            .setName('message-id')
            .setDescription('Message ID of a reaction-role message I posted')
            .setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('emoji').setDescription('Emoji to react with').setRequired(true)
        )
        .addRoleOption((o) =>
          o.setName('role').setDescription('Role to grant on reaction').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove an emoji binding from a reaction-role message')
        .addStringOption((o) =>
          o.setName('message-id').setDescription('Message ID').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('emoji').setDescription('Emoji to unbind').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List reaction-role messages in this guild')
    ),
  adminOnly: false,
  async execute(interaction, botId) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
      if (sub === 'create') return handleCreate(interaction, botId);
      if (sub === 'add') return handleAdd(interaction, botId);
      if (sub === 'remove') return handleRemove(interaction, botId);
      if (sub === 'list') return handleList(interaction, botId);
      return interaction.editReply('Unknown subcommand.');
    } catch (err) {
      console.error('reactrole error:', err);
      return interaction.editReply(`Something went wrong: ${err?.message || 'unknown error'}`);
    }
  },
};

async function handleCreate(interaction, botId) {
  const channel = interaction.options.getChannel('channel');
  const title = interaction.options.getString('title');
  const description = interaction.options.getString('description');

  const me = await interaction.guild.members.fetchMe();
  const perms = channel.permissionsFor(me);
  if (!perms?.has(PermissionFlagsBits.SendMessages) || !perms?.has(PermissionFlagsBits.AddReactions)) {
    return interaction.editReply(
      `I need Send Messages + Add Reactions in ${channel}. Grant those and try again.`
    );
  }

  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x5865f2);
  const posted = await channel.send({ embeds: [embed] });

  await reactionRoleRepository.createMessage({
    botId,
    guildId: interaction.guild.id,
    channelId: channel.id,
    messageId: posted.id,
    title,
    description,
  });

  return interaction.editReply(
    `Reaction-role message posted in ${channel}. Now run \`/reactrole add message-id:${posted.id} emoji:<emoji> role:<role>\` to bind reactions.`
  );
}

async function handleAdd(interaction, botId) {
  const messageId = interaction.options.getString('message-id').trim();
  const emojiInput = interaction.options.getString('emoji');
  const role = interaction.options.getRole('role');

  const parsed = parseEmoji(emojiInput);
  if (!parsed) return interaction.editReply('Invalid emoji.');

  const roleErr = await ensureMemberCanManageRole(interaction, role);
  if (roleErr) return interaction.editReply(roleErr);

  const stored = await reactionRoleRepository.getMessageByDiscordId(botId, messageId);
  if (!stored) {
    return interaction.editReply(
      'I have no reaction-role message with that ID. Use `/reactrole create` first or check the ID.'
    );
  }
  if (stored.guildId !== interaction.guild.id) {
    return interaction.editReply('That message belongs to a different guild.');
  }

  let liveMessage;
  try {
    const channel = await interaction.guild.channels.fetch(stored.channelId);
    liveMessage = await channel.messages.fetch(messageId);
  } catch {
    return interaction.editReply(
      'I can no longer fetch that message. Was it deleted? Use `/reactrole create` again.'
    );
  }

  try {
    await liveMessage.react(parsed.reactWith);
  } catch (err) {
    return interaction.editReply(
      `I could not add that reaction (${err?.message || 'unknown error'}). For custom emoji, the bot must share a server with the emoji.`
    );
  }

  await reactionRoleRepository.addBinding(stored.id, parsed.storage, role.id);

  return interaction.editReply(
    `Bound ${parsed.reactWith} → ${role} on message \`${messageId}\`.`
  );
}

async function handleRemove(interaction, botId) {
  const messageId = interaction.options.getString('message-id').trim();
  const emojiInput = interaction.options.getString('emoji');
  const parsed = parseEmoji(emojiInput);
  if (!parsed) return interaction.editReply('Invalid emoji.');

  const stored = await reactionRoleRepository.getMessageByDiscordId(botId, messageId);
  if (!stored) return interaction.editReply('No reaction-role message with that ID.');
  if (stored.guildId !== interaction.guild.id) {
    return interaction.editReply('That message belongs to a different guild.');
  }

  const removed = await reactionRoleRepository.removeBinding(stored.id, parsed.storage);
  if (!removed) return interaction.editReply('No binding existed for that emoji.');

  try {
    const channel = await interaction.guild.channels.fetch(stored.channelId);
    const liveMessage = await channel.messages.fetch(messageId);
    const reaction = liveMessage.reactions.cache.find(
      (r) => r.emoji.id === parsed.storage || r.emoji.name === parsed.storage
    );
    if (reaction) await reaction.remove();
  } catch {
    void 0;
  }

  return interaction.editReply(`Unbound ${parsed.reactWith} from message \`${messageId}\`.`);
}

async function handleList(interaction, botId) {
  const messages = await reactionRoleRepository.listMessagesForGuild(botId, interaction.guild.id);
  if (messages.length === 0) {
    return interaction.editReply('No reaction-role messages in this guild yet.');
  }

  const lines = messages.slice(0, 10).map((m) => {
    const bindings = m.bindings
      .map((b) => `${/^\d+$/.test(b.emoji) ? `<:e:${b.emoji}>` : b.emoji} → <@&${b.roleId}>`)
      .join(', ') || '_no bindings yet_';
    return `**${m.title || '(untitled)'}** — <#${m.channelId}> · \`${m.messageId}\`\n${bindings}`;
  });

  const embed = new EmbedBuilder()
    .setTitle('Reaction-role messages')
    .setDescription(lines.join('\n\n'))
    .setColor(0x5865f2);

  if (messages.length > 10) embed.setFooter({ text: `Showing 10 of ${messages.length}` });

  return interaction.editReply({ embeds: [embed] });
}
