import { getGuildConfig } from './configManager.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export default async function handleVerification(interaction) {
  try {
    const config = await getGuildConfig(interaction.guild.id);

    if (!config.verificationEnabled || !config.verificationRoleId) {
      return interaction.reply({ content: '❌ Verification is not properly configured.', ephemeral: true });
    }

    const role = interaction.guild.roles.cache.get(config.verificationRoleId);

    if (!role) {
      return interaction.reply({ content: '❌ Verification role not found.', ephemeral: true });
    }

    if (interaction.member.roles.cache.has(role.id)) {
      return interaction.reply({ content: '✅ You are already verified!', ephemeral: true });
    }

    await interaction.member.roles.add(role);
    await interaction.reply({ content: '✅ You have been verified! Welcome to the server.', ephemeral: true });
  } catch (error) {
    console.error('Verification error:', error);
    await interaction.reply({ content: '❌ An error occurred during verification.', ephemeral: true });
  }
}

export async function sendVerificationMessage(guildId, channelId, message, emoji, buttonText, method) {
  const { default: client } = await import('../index.js');

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error('Guild not found');
  }

  const channel = guild.channels.cache.get(channelId);
  if (!channel) {
    throw new Error('Channel not found');
  }

  if (!channel.isTextBased()) {
    throw new Error('Channel must be a text channel');
  }

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🔐 Verification Required')
    .setDescription(message)
    .setTimestamp();

  if (method === 'button') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verify_button')
          .setLabel(buttonText)
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
      );

    const sentMessage = await channel.send({ embeds: [embed], components: [row] });
    return sentMessage;
  } else if (method === 'reaction') {
    const sentMessage = await channel.send({ embeds: [embed] });

    try {
      await sentMessage.react(emoji);
    } catch (error) {
      console.error('Failed to add reaction:', error);
      throw new Error('Invalid emoji or bot lacks permission to add reactions');
    }

    return sentMessage;
  }

  throw new Error('Invalid verification method');
}
