import { PermissionFlagsBits } from 'discord.js';
import { getGuildConfig } from '../utils/configManager.js';

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    }
  },
};

async function handleCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    return interaction.reply({ content: '❌ Command not found.', ephemeral: true });
  }

  const config = await getGuildConfig(interaction.guild.id);
  
  if (config.disabledCommands && config.disabledCommands.includes(interaction.commandName)) {
    return interaction.reply({ 
      content: '❌ This command has been disabled by server administrators.', 
      ephemeral: true 
    });
  }

  if (command.adminOnly && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ This command requires Administrator permission.', ephemeral: true });
  }

  const { cooldowns } = interaction.client;

  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Map());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return interaction.reply({
        content: `⏱️ Please wait ${timeLeft.toFixed(1)} more seconds before using \`${command.data.name}\` again.`,
        ephemeral: true,
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    const reply = { content: '❌ There was an error executing this command.', ephemeral: true };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}

async function handleButton(interaction) {
  if (interaction.customId === 'verify_button') {
    const { default: handleVerification } = await import('../utils/verification.js');
    await handleVerification(interaction);
  }
}
