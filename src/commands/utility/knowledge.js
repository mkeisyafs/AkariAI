import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { knowledgeService } from '../../services/knowledgeService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('knowledge')
    .setDescription('Manage AI knowledge base')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new knowledge entry')
        .addStringOption(option =>
          option
            .setName('key')
            .setDescription('Knowledge key (unique identifier)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('value')
            .setDescription('Knowledge value (what the AI should know)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Category for organization')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Optional description of this knowledge')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('get')
        .setDescription('Get a specific knowledge entry')
        .addStringOption(option =>
          option
            .setName('key')
            .setDescription('Knowledge key to retrieve')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all knowledge entries')
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Filter by category')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Update an existing knowledge entry')
        .addStringOption(option =>
          option
            .setName('key')
            .setDescription('Knowledge key to update')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('value')
            .setDescription('New value')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('New category')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('New description')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a knowledge entry')
        .addStringOption(option =>
          option
            .setName('key')
            .setDescription('Knowledge key to delete')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('search')
        .setDescription('Search knowledge entries')
        .addStringOption(option =>
          option
            .setName('query')
            .setDescription('Search term')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('categories')
        .setDescription('List all knowledge categories')
    ),

  async execute(interaction, botId) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      switch (subcommand) {
        case 'add':
          await handleAdd(interaction, guildId, botId);
          break;
        case 'get':
          await handleGet(interaction, guildId, botId);
          break;
        case 'list':
          await handleList(interaction, guildId, botId);
          break;
        case 'update':
          await handleUpdate(interaction, guildId, botId);
          break;
        case 'delete':
          await handleDelete(interaction, guildId, botId);
          break;
        case 'search':
          await handleSearch(interaction, guildId, botId);
          break;
        case 'categories':
          await handleCategories(interaction, guildId, botId);
          break;
      }
    } catch (error) {
      console.error('Knowledge command error:', error);
      const errorMessage = 'An error occurred while processing your request.';

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};

async function handleAdd(interaction, guildId, botId) {
  const key = interaction.options.getString('key');
  const value = interaction.options.getString('value');
  const category = interaction.options.getString('category') || 'general';
  const description = interaction.options.getString('description');

  const result = await knowledgeService.addKnowledge(
    guildId,
    botId,
    key,
    value,
    category,
    description,
    interaction.user.id
  );

  if (result.success) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ Knowledge Added')
      .addFields(
        { name: 'Key', value: result.knowledge.key, inline: true },
        { name: 'Category', value: result.knowledge.category, inline: true },
        { name: 'Value', value: result.knowledge.value }
      )
      .setTimestamp();

    if (description) {
      embed.addFields({ name: 'Description', value: description });
    }

    await interaction.reply({ embeds: [embed] });
  } else {
    await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
  }
}

async function handleGet(interaction, guildId, botId) {
  const key = interaction.options.getString('key');
  const knowledge = await knowledgeService.getKnowledge(guildId, botId, key);

  if (knowledge) {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`📚 Knowledge: ${knowledge.key}`)
      .addFields(
        { name: 'Category', value: knowledge.category, inline: true },
        { name: 'Created', value: `<t:${Math.floor(knowledge.createdAt.getTime() / 1000)}:R>`, inline: true },
        { name: 'Value', value: knowledge.value }
      )
      .setTimestamp();

    if (knowledge.description) {
      embed.addFields({ name: 'Description', value: knowledge.description });
    }

    await interaction.reply({ embeds: [embed] });
  } else {
    await interaction.reply({ content: '❌ Knowledge entry not found.', ephemeral: true });
  }
}

async function handleList(interaction, guildId, botId) {
  const category = interaction.options.getString('category');
  const knowledge = await knowledgeService.getAllKnowledge(guildId, botId, category);

  if (knowledge.length === 0) {
    const message = category
      ? `No knowledge entries found in category "${category}".`
      : 'No knowledge entries found.';
    await interaction.reply({ content: message, ephemeral: true });
    return;
  }

  const byCategory = {};
  knowledge.forEach(entry => {
    if (!byCategory[entry.category]) {
      byCategory[entry.category] = [];
    }
    byCategory[entry.category].push(entry);
  });

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('📚 Knowledge Base')
    .setDescription(`Total entries: ${knowledge.length}`)
    .setTimestamp();

  Object.entries(byCategory).forEach(([cat, entries]) => {
    const entryList = entries
      .map(e => `• **${e.key}**: ${e.value.substring(0, 50)}${e.value.length > 50 ? '...' : ''}`)
      .join('\n');

    embed.addFields({
      name: `${cat} (${entries.length})`,
      value: entryList.substring(0, 1024)
    });
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleUpdate(interaction, guildId, botId) {
  const key = interaction.options.getString('key');
  const value = interaction.options.getString('value');
  const category = interaction.options.getString('category');
  const description = interaction.options.getString('description');

  const updates = {};
  if (value) updates.value = value;
  if (category) updates.category = category;
  if (description !== null) updates.description = description;

  if (Object.keys(updates).length === 0) {
    await interaction.reply({ content: '❌ Please provide at least one field to update.', ephemeral: true });
    return;
  }

  const result = await knowledgeService.updateKnowledge(guildId, botId, key, updates);

  if (result.success) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ Knowledge Updated')
      .addFields(
        { name: 'Key', value: result.knowledge.key, inline: true },
        { name: 'Category', value: result.knowledge.category, inline: true },
        { name: 'Value', value: result.knowledge.value }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } else {
    await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
  }
}

async function handleDelete(interaction, guildId, botId) {
  const key = interaction.options.getString('key');
  const result = await knowledgeService.deleteKnowledge(guildId, botId, key);

  if (result.success) {
    await interaction.reply({ content: `✅ Knowledge entry "${key}" has been deleted.` });
  } else {
    await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
  }
}

async function handleSearch(interaction, guildId, botId) {
  const query = interaction.options.getString('query');
  const results = await knowledgeService.searchKnowledge(guildId, botId, query);

  if (results.length === 0) {
    await interaction.reply({ content: `No knowledge entries found matching "${query}".`, ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`🔍 Search Results: "${query}"`)
    .setDescription(`Found ${results.length} matching entries`)
    .setTimestamp();

  results.slice(0, 10).forEach(entry => {
    embed.addFields({
      name: `${entry.key} (${entry.category})`,
      value: entry.value.substring(0, 100) + (entry.value.length > 100 ? '...' : '')
    });
  });

  if (results.length > 10) {
    embed.setFooter({ text: `Showing 10 of ${results.length} results` });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleCategories(interaction, guildId, botId) {
  const categories = await knowledgeService.getCategories(guildId, botId);

  if (categories.length === 0) {
    await interaction.reply({ content: 'No categories found.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('📂 Knowledge Categories')
    .setDescription(categories.map(c => `• ${c}`).join('\n'))
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
