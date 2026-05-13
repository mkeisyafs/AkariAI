import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getGuildConfig } from '../utils/configManager.js';

export default {
  name: 'guildMemberAdd',
  async execute(client, botId, member) {
    const config = await getGuildConfig(member.guild.id);

    // Auto-assign roles if enabled
    if (config.autoRoleEnabled && config.autoRoleIds && config.autoRoleIds.length > 0) {
      await assignAutoRoles(member, config);
    }

    if (config.welcomeEnabled && config.welcomeChannelId) {
      await sendWelcomeMessage(member, config);
    }

    if (config.verificationEnabled && config.verificationChannelId) {
      await sendVerificationMessage(member, config);
    }
  },
};

async function sendWelcomeMessage(member, config) {
  try {
    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (!channel) return;

    const message = config.welcomeMessage
      .replace('{user}', `<@${member.id}>`)
      .replace('{server}', member.guild.name)
      .replace('{memberCount}', member.guild.memberCount.toString());

    if (config.welcomeUseEmbed) {
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Welcome!')
        .setDescription(message)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } else {
      await channel.send(message);
    }
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
}

async function sendVerificationMessage(member, config) {
  try {
    const channel = member.guild.channels.cache.get(config.verificationChannelId);
    if (!channel) return;

    if (config.verificationMethod === 'button') {
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Verification Required')
        .setDescription(`Welcome ${member}! Please click the button below to verify and gain access to the server.`);

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('verify_button')
            .setLabel('✅ Verify')
            .setStyle(ButtonStyle.Success)
        );

      await channel.send({ embeds: [embed], components: [row] });
    }
  } catch (error) {
    console.error('Error sending verification message:', error);
  }
}

async function assignAutoRoles(member, config) {
  try {
    const validRoleIds = [];
    
    for (const roleId of config.autoRoleIds) {
      const role = member.guild.roles.cache.get(roleId);
      if (!role) {
        console.warn(`Auto-role ${roleId} not found in guild ${member.guild.id}`);
        continue;
      }
      
      if (member.roles.cache.has(roleId)) {
        continue;
      }
      
      validRoleIds.push(roleId);
    }
    
    if (validRoleIds.length > 0) {
      await member.roles.add(validRoleIds);
      console.log(`Auto-assigned ${validRoleIds.length} role(s) to ${member.user.tag} in ${member.guild.name}`);
    }
  } catch (error) {
    console.error('Error assigning auto-roles:', error);
  }
}
