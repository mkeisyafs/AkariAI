import { PermissionFlagsBits, Collection } from 'discord.js';
import { getGuildConfig } from '../utils/configManager.js';
import { getBotCommands } from '../services/botCommands.js';

const commandUserCooldowns = new Collection();

export default {
  name: 'interactionCreate',
  async execute(client, botId, interaction) {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction, botId);
    } else if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction, botId);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    }
  },
};

async function handleAutocomplete(interaction, botId) {
  const command = getBotCommands(botId).get(interaction.commandName);
  if (!command || typeof command.autocomplete !== 'function') {
    try {
      await interaction.respond([]);
    } catch {
      void 0;
    }
    return;
  }
  try {
    await command.autocomplete(interaction, botId);
  } catch (error) {
    console.error(`Autocomplete error for ${interaction.commandName}:`, error);
    try {
      await interaction.respond([]);
    } catch {
      void 0;
    }
  }
}

async function handleCommand(interaction, botId) {
  const command = getBotCommands(botId).get(interaction.commandName);

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

  if (!commandUserCooldowns.has(command.data.name)) {
    commandUserCooldowns.set(command.data.name, new Map());
  }

  const now = Date.now();
  const timestamps = commandUserCooldowns.get(command.data.name);
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
    await command.execute(interaction, botId);
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
