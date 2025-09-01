import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatCents, toCents } from '../utils/money.js';

export const data = new SlashCommandBuilder()
  .setName('guild')
  .setDescription('🏛️ Système de guildes')
  .setDMPermission(false)
  .addSubcommand(sub => sub
    .setName('create')
    .setDescription('Créer une nouvelle guilde')
    .addStringOption(opt => opt.setName('nom').setDescription('Nom de la guilde').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Description').setRequired(false)))
  .addSubcommand(sub => sub
    .setName('join')
    .setDescription('Rejoindre une guilde')
    .addStringOption(opt => opt.setName('nom').setDescription('Nom de la guilde').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('info')
    .setDescription('Informations sur une guilde')
    .addStringOption(opt => opt.setName('nom').setDescription('Nom de la guilde').setRequired(false)))
  .addSubcommand(sub => sub
    .setName('list')
    .setDescription('Liste des guildes disponibles'));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const sub = interaction.options.getSubcommand();

  if (sub === 'create') {
    const name = interaction.options.getString('nom');
    const description = interaction.options.getString('description') || 'Aucune description';
    
    const currentGuild = db.getUserGuild(uid);
    if (currentGuild) {
      return interaction.reply({ 
        content: '🏛️ Vous êtes déjà membre d\'une guilde. Quittez-la d\'abord.', 
        flags: 64 
      });
    }

    if (db.getGuildByName(name)) {
      return interaction.reply({ 
        content: '❌ Ce nom de guilde est déjà pris.', 
        flags: 64 
      });
    }

    const creationCost = toCents(5000);
    if (user.balance < creationCost) {
      return interaction.reply({ 
        content: '💰 Il faut 5,000.00 Ǥ pour créer une guilde.', 
        flags: 64 
      });
    }

    db.adjustBalance(uid, -creationCost);
    const guildId = db.createGuild(name, description, uid);
    
    const embed = new EmbedBuilder()
      .setTitle('🏛️ Guilde Créée')
      .setColor(0x4caf50)
      .setDescription(`**${name}** a été fondée !\n\n*${description}*`)
      .addFields(
        { name: '👑 Leader', value: `<@${uid}>`, inline: true },
        { name: '👥 Membres', value: '1', inline: true },
        { name: '💰 Coût', value: '5,000.00 Ǥ', inline: true }
      )
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'join') {
    const guildName = interaction.options.getString('nom');
    const guild = db.getGuildByName(guildName);
    
    if (!guild) {
      return interaction.reply({ content: '❌ Guilde introuvable.', flags: 64 });
    }

    const currentGuild = db.getUserGuild(uid);
    if (currentGuild) {
      return interaction.reply({ content: '🏛️ Vous êtes déjà membre d\'une guilde.', flags: 64 });
    }

    db.joinGuild(uid, guild.id);
    
    const embed = new EmbedBuilder()
      .setTitle('🤝 Bienvenue dans la Guilde')
      .setColor(0x2196f3)
      .setDescription(`Vous avez rejoint **${guild.name}** !\n\n*${guild.description}*`)
      .addFields(
        { name: '🎯 Votre Rang', value: '👤 Membre', inline: true }
      )
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'info') {
    const guildName = interaction.options.getString('nom');
    let guild;
    
    if (guildName) {
      guild = db.getGuildByName(guildName);
    } else {
      guild = db.getUserGuild(uid);
    }

    if (!guild) {
      return interaction.reply({ content: '❌ Guilde introuvable.', flags: 64 });
    }

    const members = db.getGuildMembers(guild.id);

    const embed = new EmbedBuilder()
      .setTitle(`🏛️ ${guild.name}`)
      .setColor(0x9c27b0)
      .setDescription(guild.description)
      .addFields(
        { name: '👑 Leader', value: `<@${guild.leader_id}>`, inline: true },
        { name: '👥 Membres', value: `${members.length}`, inline: true },
        { name: '💰 Trésor', value: `${formatCents(guild.treasury)} Ǥ`, inline: true },
        { name: '⭐ Niveau', value: `${guild.level}`, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'list') {
    const guilds = db.getAllGuilds();
    
    if (guilds.length === 0) {
      return interaction.reply('🏛️ Aucune guilde n\'existe pour le moment.');
    }

    const embed = new EmbedBuilder()
      .setTitle('🏛️ Guildes de GrokCity')
      .setColor(0x607d8b)
      .setDescription('**Guildes disponibles :**');

    for (const guild of guilds.slice(0, 10)) {
      const memberCount = db.getGuildMembers(guild.id).length;
      embed.addFields({
        name: `${guild.name} (Niveau ${guild.level})`,
        value: `${guild.description}\n👥 ${memberCount} membres • 💰 ${formatCents(guild.treasury)} Ǥ`,
        inline: false
      });
    }

    return interaction.reply({ embeds: [embed] });
  }

  return interaction.reply({ content: '🚧 Fonctionnalité en développement.', flags: 64 });
}