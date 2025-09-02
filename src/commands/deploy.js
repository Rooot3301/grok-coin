import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS } from '../utils/symbols.js';

export const data = new SlashCommandBuilder()
  .setName('deploy')
  .setDescription('🚀 Commandes de déploiement et maintenance (Admin seulement)')
  .addSubcommand(sub => sub
    .setName('status')
    .setDescription('Vérifier le statut du bot'))
  .addSubcommand(sub => sub
    .setName('restart')
    .setDescription('Redémarrer le bot (Admin seulement)'))
  .addSubcommand(sub => sub
    .setName('backup')
    .setDescription('Créer une sauvegarde de la base de données'))
  .addSubcommand(sub => sub
    .setName('stats')
    .setDescription('Statistiques détaillées du serveur'));

export async function execute(interaction, db, config) {
  const sub = interaction.options.getSubcommand();
  
  if (sub === 'status') {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const totalUsersResult = await db.execute('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult.rows[0].count;
    const totalGuildsResult = await db.execute('SELECT COUNT(*) as count FROM guilds');
    const totalGuilds = totalGuildsResult.rows[0].count;
    const totalCirculation = await db.getTotalCirculation();
    const activeWarsResult = await db.execute('SELECT COUNT(*) as count FROM guild_wars WHERE status = "active"');
    const activeWars = activeWarsResult.rows[0].count;
    
    const embed = new EmbedBuilder()
      .setTitle('🚀 Statut du Bot')
      .setColor(COLORS.SUCCESS)
      .setDescription(`**GrokCoin Bot v${process.env.npm_package_version || '1.0.0'} est opérationnel !**`)
      .addFields(
        { name: '⏱️ Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
        { name: '👥 Utilisateurs', value: `${totalUsers}`, inline: true },
        { name: '🏛️ Guildes', value: `${totalGuilds}`, inline: true },
        { name: '⚔️ Guerres', value: `${activeWars} actives`, inline: true },
        { name: '💰 Circulation', value: `${(totalCirculation / 100).toFixed(2)} Ǥ`, inline: true },
        { name: '🖥️ Mémoire', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`, inline: true },
        { name: '🌐 Serveurs', value: `${interaction.client.guilds.cache.size}`, inline: true },
        { name: '📊 Node.js', value: process.version, inline: true },
        { name: '🔧 Environnement', value: process.env.NODE_ENV || 'development', inline: true }
      )
      .setFooter({ text: `🚀 Bot en ligne • PID: ${process.pid}` })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }
  
  if (sub === 'restart') {
    // Vérifier les permissions admin
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Seuls les administrateurs peuvent redémarrer le bot.', flags: 64 });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🔄 Redémarrage du Bot')
      .setColor(COLORS.WARNING)
      .setDescription('**Le bot va redémarrer dans 5 secondes...**\n\nToutes les interactions en cours seront interrompues.')
      .setFooter({ text: '🔄 Redémarrage en cours' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    setTimeout(() => {
      console.log('Redémarrage du bot demandé par', interaction.user.tag);
      process.exit(0);
    }, 5000);
  }
  
  if (sub === 'backup') {
    // Vérifier les permissions admin
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Seuls les administrateurs peuvent créer des sauvegardes.', flags: 64 });
    }
    
    try {
      // Créer une sauvegarde simple (copie de la DB)
      const fs = await import('fs');
      const path = await import('path');
      
      const dbPath = process.env.DB_PATH || './grokcoin.db';
      const backupPath = `./backup_${Date.now()}.db`;
      
      fs.copyFileSync(dbPath, backupPath);
      
      const embed = new EmbedBuilder()
        .setTitle('💾 Sauvegarde Créée')
        .setColor(COLORS.SUCCESS)
        .setDescription(`**Sauvegarde créée avec succès !**\n\nFichier: \`${backupPath}\``)
        .setFooter({ text: '💾 Sauvegarde terminée' })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Erreur de Sauvegarde')
        .setColor(COLORS.ERROR)
        .setDescription(`**Erreur lors de la sauvegarde :**\n\`\`\`${error.message}\`\`\``)
        .setFooter({ text: '❌ Sauvegarde échouée' })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }
  }
  
  if (sub === 'stats') {
    const totalUsersResult = await db.execute('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult.rows[0].count;
    const totalGuildsResult = await db.execute('SELECT COUNT(*) as count FROM guilds');
    const totalGuilds = totalGuildsResult.rows[0].count;
    const activeWarsResult = await db.execute('SELECT COUNT(*) as count FROM guild_wars WHERE status = "active"');
    const activeWars = activeWarsResult.rows[0].count;
    const totalPropertiesResult = await db.execute('SELECT COUNT(*) as count FROM user_properties');
    const totalProperties = totalPropertiesResult.rows[0].count;
    const totalLoansResult = await db.execute('SELECT COUNT(*) as count FROM loans');
    const totalLoans = totalLoansResult.rows[0].count;
    const totalCirculation = await db.getTotalCirculation();
    
    // Top 5 des plus riches
    const richestResult = await db.execute(`
      SELECT id, balance + bank_balance as total_wealth 
      FROM users 
      ORDER BY total_wealth DESC 
      LIMIT 5
    `);
    const richest = richestResult.rows;
    
    const richestText = richest.map((u, i) => 
      `${i + 1}. <@${u.id}>: ${(u.total_wealth / 100).toFixed(2)} Ǥ`
    ).join('\n');
    
    const embed = new EmbedBuilder()
      .setTitle('📊 Statistiques Détaillées')
      .setColor(COLORS.INFO)
      .setDescription('**État complet de l\'économie GrokCity**')
      .addFields(
        { name: '👥 Utilisateurs', value: `${totalUsers}`, inline: true },
        { name: '🏛️ Guildes', value: `${totalGuilds}`, inline: true },
        { name: '⚔️ Guerres Actives', value: `${activeWars}`, inline: true },
        { name: '🏠 Propriétés', value: `${totalProperties}`, inline: true },
        { name: '🏦 Prêts Actifs', value: `${totalLoans}`, inline: true },
        { name: '💰 Circulation', value: `${(totalCirculation / 100).toFixed(2)} Ǥ`, inline: true },
        { name: '🏆 Top 5 Richesse', value: richestText || 'Aucun utilisateur', inline: false }
      )
      .setFooter({ text: '📊 Statistiques en temps réel' })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }
}