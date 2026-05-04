import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../../utils/configManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage dashboard access whitelist for this server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable whitelist (only whitelisted users/roles can access dashboard)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable whitelist (all server admins can access dashboard)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add-user')
        .setDescription('Add a user to the dashboard whitelist')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to whitelist')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-user')
        .setDescription('Remove a user from the dashboard whitelist')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add-role')
        .setDescription('Add a role to the dashboard whitelist')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to whitelist')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-role')
        .setDescription('Remove a role from the dashboard whitelist')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current dashboard whitelist settings')
    ),
  adminOnly: true,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      return await viewWhitelist(interaction);
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getGuildConfig(interaction.guild.id);

      switch (subcommand) {
        case 'enable':
          await updateGuildConfig(interaction.guild.id, {
            whitelistEnabled: true
          });
          await interaction.editReply('✅ Dashboard whitelist enabled! Only whitelisted users and roles can access this server\'s dashboard.');
          break;

        case 'disable':
          await updateGuildConfig(interaction.guild.id, {
            whitelistEnabled: false
          });
          await interaction.editReply('✅ Dashboard whitelist disabled! All server administrators can access the dashboard.');
          break;

        case 'add-user':
          const userToAdd = interaction.options.getUser('user');
          if (!config.whitelistUserIds.includes(userToAdd.id)) {
            await updateGuildConfig(interaction.guild.id, {
              whitelistUserIds: [...config.whitelistUserIds, userToAdd.id]
            });
            await interaction.editReply(`✅ Added ${userToAdd} to the dashboard whitelist!`);
          } else {
            await interaction.editReply('❌ User is already whitelisted!');
          }
          break;

        case 'remove-user':
          const userToRemove = interaction.options.getUser('user');
          const filteredUsers = config.whitelistUserIds.filter(id => id !== userToRemove.id);
          if (filteredUsers.length < config.whitelistUserIds.length) {
            await updateGuildConfig(interaction.guild.id, {
              whitelistUserIds: filteredUsers
            });
            await interaction.editReply(`✅ Removed ${userToRemove} from the dashboard whitelist!`);
          } else {
            await interaction.editReply('❌ User is not in the whitelist!');
          }
          break;

        case 'add-role':
          const roleToAdd = interaction.options.getRole('role');
          if (!config.whitelistRoleIds.includes(roleToAdd.id)) {
            await updateGuildConfig(interaction.guild.id, {
              whitelistRoleIds: [...config.whitelistRoleIds, roleToAdd.id]
            });
            await interaction.editReply(`✅ Added ${roleToAdd} to the dashboard whitelist!`);
          } else {
            await interaction.editReply('❌ Role is already whitelisted!');
          }
          break;

        case 'remove-role':
          const roleToRemove = interaction.options.getRole('role');
          const filteredRoles = config.whitelistRoleIds.filter(id => id !== roleToRemove.id);
          if (filteredRoles.length < config.whitelistRoleIds.length) {
            await updateGuildConfig(interaction.guild.id, {
              whitelistRoleIds: filteredRoles
            });
            await interaction.editReply(`✅ Removed ${roleToRemove} from the dashboard whitelist!`);
          } else {
            await interaction.editReply('❌ Role is not in the whitelist!');
          }
          break;
      }
    } catch (error) {
      console.error('Whitelist command error:', error);
      await interaction.editReply('❌ An error occurred while updating whitelist.');
    }
  },
};

async function viewWhitelist(interaction) {
  const config = await getGuildConfig(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setColor(config.whitelistEnabled ? '#00ff00' : '#ff0000')
    .setTitle('🔒 Dashboard Access Whitelist')
    .addFields(
      {
        name: '📊 Status',
        value: config.whitelistEnabled ? '✅ Enabled' : '❌ Disabled',
        inline: false
      },
      {
        name: '👥 Whitelisted Users',
        value: config.whitelistUserIds.length > 0
          ? config.whitelistUserIds.map(id => `<@${id}>`).join(', ')
          : 'None',
        inline: false
      },
      {
        name: '🎭 Whitelisted Roles',
        value: config.whitelistRoleIds.length > 0
          ? config.whitelistRoleIds.map(id => `<@&${id}>`).join(', ')
          : 'None',
        inline: false
      }
    )
    .setFooter({ text: 'Note: This only affects dashboard access, not bot commands' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
