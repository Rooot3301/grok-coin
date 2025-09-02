import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { formatCents, toCents } from '../utils/money.js';
import { COLORS } from '../utils/symbols.js';

export const data = new SlashCommandBuilder()
  .setName('guild')
  .setDescription('🏛️ Système de guildes')
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
    .setDescription('Liste des guildes disponibles'))
  .addSubcommand(sub => sub
    .setName('war')
    .setDescription('Déclarer la guerre à une autre guilde')
    .addStringOption(opt => opt.setName('cible').setDescription('Nom de la guilde cible').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('attack')
    .setDescription('Attaquer une guilde ennemie')
    .addStringOption(opt => opt.setName('cible').setDescription('Nom de la guilde cible').setRequired(true))
    .addStringOption(opt => opt.setName('type').setDescription('Type d\'attaque').setRequired(true).addChoices(
      { name: 'Raid du Trésor', value: 'treasury' },
      { name: 'Sabotage Économique', value: 'sabotage' },
      { name: 'Infiltration', value: 'infiltration' }
    )))
  .addSubcommand(sub => sub
    .setName('defend')
    .setDescription('Organiser la défense de votre guilde')
    .addStringOption(opt => opt.setName('type').setDescription('Type de défense').setRequired(true).addChoices(
      { name: 'Fortifications', value: 'fortify' },
      { name: 'Contre-Espionnage', value: 'counter_spy' },
      { name: 'Garde Renforcée', value: 'guard' }
    )))
  .addSubcommand(sub => sub
    .setName('spy')
    .setDescription('Espionner une guilde rivale')
    .addStringOption(opt => opt.setName('cible').setDescription('Nom de la guilde cible').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('alliance')
    .setDescription('Proposer une alliance')
    .addStringOption(opt => opt.setName('cible').setDescription('Nom de la guilde').setRequired(true)));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const sub = interaction.options.getSubcommand();

  try {
    if (sub === 'create') {
      const name = interaction.options.getString('nom');
      const description = interaction.options.getString('description') || 'Aucune description';
      
      const currentGuild = await db.getUserGuild(uid);
      if (currentGuild) {
        return interaction.reply({ 
          content: '🏛️ Vous êtes déjà membre d\'une guilde. Quittez-la d\'abord.', 
          flags: 64 
        });
      }

      const existingGuild = await db.getGuildByName(name);
      if (existingGuild) {
        return interaction.reply({ 
          content: '❌ Ce nom de guilde est déjà pris.', 
          flags: 64 
        });
      }

      const user = await db.getUser(uid);
      const creationCost = toCents(5000);
      if (user.balance < creationCost) {
        return interaction.reply({ 
          content: '💰 Il faut 5,000.00 Ǥ pour créer une guilde.', 
          flags: 64 
        });
      }

      await db.adjustBalance(uid, -creationCost);
      const guildId = await db.createGuild(name, description, uid);
      
      const embed = new EmbedBuilder()
        .setTitle('🏛️ Guilde Créée')
        .setColor(COLORS.SUCCESS)
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
      const guild = await db.getGuildByName(guildName);
      
      if (!guild) {
        return interaction.reply({ content: '❌ Guilde introuvable.', flags: 64 });
      }

      const currentGuild = await db.getUserGuild(uid);
      if (currentGuild) {
        return interaction.reply({ content: '🏛️ Vous êtes déjà membre d\'une guilde.', flags: 64 });
      }

      await db.joinGuild(uid, guild.id);
      
      const embed = new EmbedBuilder()
        .setTitle('🤝 Bienvenue dans la Guilde')
        .setColor(COLORS.INFO)
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
        guild = await db.getGuildByName(guildName);
      } else {
        guild = await db.getUserGuild(uid);
      }

      if (!guild) {
        return interaction.reply({ content: '❌ Guilde introuvable.', flags: 64 });
      }

      const members = await db.getGuildMembers(guild.id);
      const wars = await db.getGuildWars(guild.id);
      const alliances = await db.getGuildAlliances(guild.id);

      const embed = new EmbedBuilder()
        .setTitle(`🏛️ ${guild.name}`)
        .setColor(COLORS.GOLD)
        .setDescription(guild.description || 'Aucune description')
        .addFields(
          { name: '👑 Leader', value: `<@${guild.leader_id}>`, inline: true },
          { name: '👥 Membres', value: `${members.length}`, inline: true },
          { name: '💰 Trésor', value: `${formatCents(guild.treasury)} Ǥ`, inline: true },
          { name: '⭐ Niveau', value: `${guild.level}`, inline: true },
          { name: '⚔️ Guerres', value: `${wars.length} actives`, inline: true },
          { name: '🤝 Alliances', value: `${alliances.length} actives`, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'list') {
      const guilds = await db.getAllGuilds();
      
      if (!guilds || guilds.length === 0) {
        return interaction.reply({ content: '🏛️ Aucune guilde n\'existe pour le moment.', flags: 64 });
      }

      const embed = new EmbedBuilder()
        .setTitle('🏛️ Guildes de GrokCity')
        .setColor(COLORS.NEUTRAL)
        .setDescription('**Guildes disponibles :**');

      const guildList = Array.isArray(guilds) ? guilds : [];
      for (const guild of guildList.slice(0, 10)) {
        const memberCount = (await db.getGuildMembers(guild.id)).length;
        embed.addFields({
          name: `${guild.name} (Niveau ${guild.level})`,
          value: `${guild.description || 'Aucune description'}\n👥 ${memberCount} membres • 💰 ${formatCents(guild.treasury)} Ǥ`,
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'war') {
      const targetName = interaction.options.getString('cible');
      const userGuild = await db.getUserGuild(uid);
      
      if (!userGuild) {
        return interaction.reply({ content: '❌ Vous devez être dans une guilde.', flags: 64 });
      }
      
      if (userGuild.rank !== 'leader') {
        return interaction.reply({ content: '❌ Seul le leader peut déclarer la guerre.', flags: 64 });
      }
      
      const targetGuild = await db.getGuildByName(targetName);
      if (!targetGuild) {
        return interaction.reply({ content: '❌ Guilde cible introuvable.', flags: 64 });
      }
      
      if (targetGuild.id === userGuild.id) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas déclarer la guerre à votre propre guilde.', flags: 64 });
      }
      
      const existingWar = await db.getWarBetweenGuilds(userGuild.id, targetGuild.id);
      if (existingWar) {
        return interaction.reply({ content: '⚔️ Une guerre est déjà en cours avec cette guilde.', flags: 64 });
      }
      
      await db.declareWar(userGuild.id, targetGuild.id);
      
      const embed = new EmbedBuilder()
        .setTitle('⚔️ Guerre Déclarée')
        .setColor(COLORS.ERROR)
        .setDescription(`**${userGuild.name}** déclare la guerre à **${targetGuild.name}** !`)
        .addFields(
          { name: '🎯 Objectif', value: 'Piller le trésor ennemi', inline: true },
          { name: '⏰ Durée', value: '7 jours', inline: true },
          { name: '🛡️ Défense', value: 'Organisez vos défenses !', inline: true }
        )
        .setFooter({ text: 'La guerre commence maintenant !' })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'attack') {
      const targetName = interaction.options.getString('cible');
      const attackType = interaction.options.getString('type');
      const userGuild = await db.getUserGuild(uid);
      
      if (!userGuild) {
        return interaction.reply({ content: '❌ Vous devez être dans une guilde.', flags: 64 });
      }
      
      const targetGuild = await db.getGuildByName(targetName);
      if (!targetGuild) {
        return interaction.reply({ content: '❌ Guilde cible introuvable.', flags: 64 });
      }
      
      const war = await db.getWarBetweenGuilds(userGuild.id, targetGuild.id);
      if (!war) {
        return interaction.reply({ content: '❌ Aucune guerre en cours avec cette guilde.', flags: 64 });
      }
      
      // Vérifier les défenses actives
      const hasDefense = await db.hasActiveDefense(targetGuild.id, attackType);
      const attackCost = toCents(1000);
      
      const user = await db.getUser(uid);
      if (user.balance < attackCost) {
        return interaction.reply({ content: '💰 Il faut 1,000 Ǥ pour lancer une attaque.', flags: 64 });
      }
      
      await db.adjustBalance(uid, -attackCost);
      
      // Calcul du succès (réduit si défenses actives)
      let successChance = 0.6;
      if (hasDefense) successChance *= 0.4;
      
      const success = Math.random() < successChance;
      await db.recordGuildAttack(userGuild.id, targetGuild.id, attackType, success);
      
      let result = '';
      let stolenAmount = 0;
      
      if (success) {
        if (attackType === 'treasury') {
          stolenAmount = Math.floor(targetGuild.treasury * 0.1); // Vol de 10% du trésor
          await db.adjustGuildTreasury(targetGuild.id, -stolenAmount);
          await db.adjustGuildTreasury(userGuild.id, stolenAmount);
          result = `🏴‍☠️ **RAID RÉUSSI !** Vous avez pillé ${formatCents(stolenAmount)} Ǥ du trésor ennemi !`;
        } else if (attackType === 'sabotage') {
          result = `💥 **SABOTAGE RÉUSSI !** Vous avez perturbé l'économie de ${targetGuild.name} !`;
        } else if (attackType === 'infiltration') {
          result = `🕵️ **INFILTRATION RÉUSSIE !** Vous avez obtenu des informations précieuses !`;
        }
      } else {
        result = `🛡️ **ATTAQUE REPOUSSÉE !** Les défenses de ${targetGuild.name} ont tenu bon.`;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`⚔️ Attaque: ${attackType}`)
        .setColor(success ? COLORS.SUCCESS : COLORS.ERROR)
        .setDescription(result)
        .addFields(
          { name: '🎯 Cible', value: targetGuild.name, inline: true },
          { name: '💰 Coût', value: `${formatCents(attackCost)} Ǥ`, inline: true },
          { name: '🛡️ Défenses', value: hasDefense ? 'Actives' : 'Aucune', inline: true }
        )
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'defend') {
      const defenseType = interaction.options.getString('type');
      const userGuild = await db.getUserGuild(uid);
      
      if (!userGuild) {
        return interaction.reply({ content: '❌ Vous devez être dans une guilde.', flags: 64 });
      }
      
      if (userGuild.rank === 'member') {
        return interaction.reply({ content: '❌ Seuls les leaders et officiers peuvent organiser la défense.', flags: 64 });
      }
      
      const defenseCost = toCents(800);
      if (userGuild.treasury < defenseCost) {
        return interaction.reply({ content: '💰 Le trésor de la guilde doit avoir au moins 800 Ǥ.', flags: 64 });
      }
      
      const hasDefense = await db.hasActiveDefense(userGuild.id, defenseType);
      if (hasDefense) {
        return interaction.reply({ content: '🛡️ Cette défense est déjà active.', flags: 64 });
      }
      
      await db.adjustGuildTreasury(userGuild.id, -defenseCost);
      await db.activateGuildDefense(userGuild.id, defenseType, 24); // 24h de protection
      
      const defenseNames = {
        fortify: 'Fortifications',
        counter_spy: 'Contre-Espionnage', 
        guard: 'Garde Renforcée'
      };
      
      const embed = new EmbedBuilder()
        .setTitle('🛡️ Défense Activée')
        .setColor(COLORS.INFO)
        .setDescription(`**${defenseNames[defenseType]}** activée pour 24h !`)
        .addFields(
          { name: '💰 Coût', value: `${formatCents(defenseCost)} Ǥ`, inline: true },
          { name: '⏰ Durée', value: '24 heures', inline: true },
          { name: '🏛️ Trésor restant', value: `${formatCents((await db.getGuild(userGuild.id)).treasury)} Ǥ`, inline: true }
        )
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'spy') {
      const targetName = interaction.options.getString('cible');
      const userGuild = await db.getUserGuild(uid);
      
      if (!userGuild) {
        return interaction.reply({ content: '❌ Vous devez être dans une guilde.', flags: 64 });
      }
      
      const targetGuild = await db.getGuildByName(targetName);
      if (!targetGuild) {
        return interaction.reply({ content: '❌ Guilde cible introuvable.', flags: 64 });
      }
      
      const spyCost = toCents(500);
      const user = await db.getUser(uid);
      if (user.balance < spyCost) {
        return interaction.reply({ content: '💰 Il faut 500 Ǥ pour espionner.', flags: 64 });
      }
      
      await db.adjustBalance(uid, -spyCost);
      
      const hasCounterSpy = await db.hasActiveDefense(targetGuild.id, 'counter_spy');
      const successChance = hasCounterSpy ? 0.3 : 0.7;
      const success = Math.random() < successChance;
      
      let result = '';
      if (success) {
        const members = await db.getGuildMembers(targetGuild.id);
        result = `🕵️ **ESPIONNAGE RÉUSSI !**\n\n**Informations obtenues :**\n👥 ${members.length} membres\n💰 ${formatCents(targetGuild.treasury)} Ǥ en trésor\n⭐ Niveau ${targetGuild.level}`;
      } else {
        result = `🚨 **ESPIONNAGE ÉCHOUÉ !** Vous avez été détecté par le contre-espionnage de ${targetGuild.name}.`;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🕵️ Mission d\'Espionnage')
        .setColor(success ? COLORS.SUCCESS : COLORS.ERROR)
        .setDescription(result)
        .addFields(
          { name: '🎯 Cible', value: targetGuild.name, inline: true },
          { name: '💰 Coût', value: `${formatCents(spyCost)} Ǥ`, inline: true },
          { name: '🛡️ Contre-mesures', value: hasCounterSpy ? 'Actives' : 'Aucune', inline: true }
        )
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'alliance') {
      const targetName = interaction.options.getString('cible');
      const userGuild = await db.getUserGuild(uid);
      
      if (!userGuild) {
        return interaction.reply({ content: '❌ Vous devez être dans une guilde.', flags: 64 });
      }
      
      if (userGuild.rank !== 'leader') {
        return interaction.reply({ content: '❌ Seul le leader peut proposer des alliances.', flags: 64 });
      }
      
      const targetGuild = await db.getGuildByName(targetName);
      if (!targetGuild) {
        return interaction.reply({ content: '❌ Guilde cible introuvable.', flags: 64 });
      }
      
      if (targetGuild.id === userGuild.id) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas faire alliance avec vous-même.', flags: 64 });
      }
      
      const existingAlliance = await db.getAllianceBetweenGuilds(userGuild.id, targetGuild.id);
      if (existingAlliance) {
        return interaction.reply({ content: '🤝 Une alliance existe déjà ou est en attente.', flags: 64 });
      }
      
      await db.proposeAlliance(userGuild.id, targetGuild.id);
      
      const embed = new EmbedBuilder()
        .setTitle('🤝 Alliance Proposée')
        .setColor(COLORS.INFO)
        .setDescription(`**${userGuild.name}** propose une alliance à **${targetGuild.name}** !`)
        .addFields(
          { name: '📜 Termes', value: 'Pacte de non-agression mutuel', inline: true },
          { name: '💰 Bonus', value: '+10% revenus commerciaux', inline: true },
          { name: '⏰ Statut', value: 'En attente d\'acceptation', inline: true }
        )
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }

    return interaction.reply({ content: '🚧 Fonctionnalité en développement.', flags: 64 });
    
  } catch (error) {
    console.error('Erreur commande guild:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Erreur Guilde')
      .setColor(COLORS.ERROR)
      .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
      .setTimestamp();
    
    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
  }
}