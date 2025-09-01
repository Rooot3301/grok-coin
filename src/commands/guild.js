import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { formatCents, toCents } from '../utils/money.js';

export const data = new SlashCommandBuilder()
  .setName('guild')
  .setDescription('🏛️ Système de guildes et alliances')
  .addSubcommand(sub => sub
    .setName('create')
    .setDescription('Créer une nouvelle guilde')
    .addStringOption(opt => opt.setName('nom').setDescription('Nom de la guilde').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Description de la guilde').setRequired(false)))
  .addSubcommand(sub => sub
    .setName('join')
    .setDescription('Rejoindre une guilde')
    .addStringOption(opt => opt.setName('nom').setDescription('Nom de la guilde').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('leave')
    .setDescription('Quitter votre guilde actuelle'))
  .addSubcommand(sub => sub
    .setName('info')
    .setDescription('Informations sur votre guilde ou une autre')
    .addStringOption(opt => opt.setName('nom').setDescription('Nom de la guilde (optionnel)').setRequired(false)))
  .addSubcommand(sub => sub
    .setName('list')
    .setDescription('Liste des guildes disponibles'))
  .addSubcommand(sub => sub
    .setName('invite')
    .setDescription('Inviter un membre dans votre guilde')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre à inviter').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('kick')
    .setDescription('Expulser un membre (leaders/officiers seulement)')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre à expulser').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('promote')
    .setDescription('Promouvoir un membre (leaders seulement)')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre à promouvoir').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('treasury')
    .setDescription('Gérer le trésor de la guilde')
    .addStringOption(opt => opt.setName('action').setDescription('Action à effectuer').setRequired(true).addChoices(
      { name: 'Consulter', value: 'view' },
      { name: 'Déposer', value: 'deposit' },
      { name: 'Retirer', value: 'withdraw' }
    ))
    .addNumberOption(opt => opt.setName('montant').setDescription('Montant (pour dépôt/retrait)').setRequired(false)))
  .addSubcommand(sub => sub
    .setName('war')
    .setDescription('Déclarer la guerre à une autre guilde')
    .addStringOption(opt => opt.setName('cible').setDescription('Guilde cible').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('attack')
    .setDescription('Attaquer une guilde ennemie')
    .addStringOption(opt => opt.setName('cible').setDescription('Guilde à attaquer').setRequired(true))
    .addStringOption(opt => opt.setName('type').setDescription('Type d\'attaque').setRequired(true).addChoices(
      { name: 'Raid Économique', value: 'economic' },
      { name: 'Sabotage', value: 'sabotage' },
      { name: 'Vol de Trésor', value: 'treasury' }
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
    .addStringOption(opt => opt.setName('cible').setDescription('Guilde à espionner').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('alliance')
    .setDescription('Proposer une alliance')
    .addStringOption(opt => opt.setName('cible').setDescription('Guilde cible').setRequired(true)));

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  const sub = interaction.options.getSubcommand();

  if (sub === 'create') {
    const name = interaction.options.getString('nom');
    const description = interaction.options.getString('description') || 'Aucune description';
    
    // Vérifier si l'utilisateur est déjà dans une guilde
    const currentGuild = db.getUserGuild(uid);
    if (currentGuild) {
      return interaction.reply({ content: '🏛️ Vous êtes déjà membre d\'une guilde. Quittez-la d\'abord avec `/guild leave`.', ephemeral: true });
    }

    // Vérifier si le nom est disponible
    if (db.getGuildByName(name)) {
      return interaction.reply({ content: '❌ Ce nom de guilde est déjà pris.', ephemeral: true });
    }

    // Coût de création
    const creationCost = toCents(5000);
    if (user.balance < creationCost) {
      return interaction.reply({ content: '💰 Il faut 5,000.00 Ǥ pour créer une guilde.', ephemeral: true });
    }

    db.adjustBalance(uid, -creationCost);
    const guildId = db.createGuild(name, description, uid);
    
    const embed = new EmbedBuilder()
      .setTitle('🏛️ Guilde Créée avec Succès')
      .setColor(0x4caf50)
      .setDescription(`**${name}** a été fondée !\n\n*${description}*`)
      .addFields(
        { name: '👑 Leader', value: `<@${uid}>`, inline: true },
        { name: '👥 Membres', value: '1', inline: true },
        { name: '💰 Trésor', value: '0.00 Ǥ', inline: true },
        { name: '⭐ Niveau', value: '1', inline: true },
        { name: '🎯 Statut', value: '🟢 Recrutement Ouvert', inline: true },
        { name: '⚔️ Guerres', value: 'Aucune', inline: true }
      )
      .setFooter({ text: '🏛️ Utilisez /guild invite pour recruter des membres' })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'join') {
    const guildName = interaction.options.getString('nom');
    const guild = db.getGuildByName(guildName);
    
    if (!guild) {
      return interaction.reply({ content: '❌ Guilde introuvable.', ephemeral: true });
    }

    const currentGuild = db.getUserGuild(uid);
    if (currentGuild) {
      return interaction.reply({ content: '🏛️ Vous êtes déjà membre d\'une guilde.', ephemeral: true });
    }

    // Vérifier si la guilde accepte de nouveaux membres
    if (guild.status === 'closed') {
      return interaction.reply({ content: '🔒 Cette guilde n\'accepte pas de nouveaux membres.', ephemeral: true });
    }

    db.joinGuild(uid, guild.id);
    
    const embed = new EmbedBuilder()
      .setTitle('🤝 Bienvenue dans la Guilde')
      .setColor(0x2196f3)
      .setDescription(`Vous avez rejoint **${guild.name}** !\n\n*${guild.description}*`)
      .addFields(
        { name: '🎯 Votre Rang', value: '👤 Membre', inline: true },
        { name: '💡 Conseil', value: 'Contribuez au trésor pour gagner de l\'expérience !', inline: false }
      )
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'leave') {
    const currentGuild = db.getUserGuild(uid);
    if (!currentGuild) {
      return interaction.reply({ content: '❌ Vous n\'êtes membre d\'aucune guilde.', ephemeral: true });
    }

    if (currentGuild.leader_id === uid) {
      return interaction.reply({ content: '👑 En tant que leader, vous devez transférer le leadership avant de quitter la guilde.', ephemeral: true });
    }

    db.leaveGuild(uid);
    return interaction.reply(`👋 Vous avez quitté la guilde **${currentGuild.name}**.`);
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
      return interaction.reply({ content: '❌ Guilde introuvable.', ephemeral: true });
    }

    const members = db.getGuildMembers(guild.id);
    const officers = members.filter(m => m.rank === 'officer');
    const wars = db.getGuildWars(guild.id);
    const alliances = db.getGuildAlliances(guild.id);

    const embed = new EmbedBuilder()
      .setTitle(`🏛️ ${guild.name}`)
      .setColor(0x9c27b0)
      .setDescription(guild.description)
      .addFields(
        { name: '👑 Leader', value: `<@${guild.leader_id}>`, inline: true },
        { name: '👥 Membres', value: `${members.length}`, inline: true },
        { name: '💰 Trésor', value: `${formatCents(guild.treasury)} Ǥ`, inline: true },
        { name: '⭐ Niveau', value: `${guild.level}`, inline: true },
        { name: '🎯 Expérience', value: `${guild.experience}/${guild.level * 1000}`, inline: true },
        { name: '🎪 Statut', value: guild.status === 'open' ? '🟢 Ouvert' : '🔴 Fermé', inline: true }
      );

    if (officers.length > 0) {
      embed.addFields({ name: '⚔️ Officiers', value: officers.map(o => `<@${o.user_id}>`).join(', '), inline: false });
    }

    if (wars.length > 0) {
      embed.addFields({ name: '⚔️ Guerres Actives', value: wars.map(w => `🔥 vs ${w.target_name}`).join('\n'), inline: false });
    }

    if (alliances.length > 0) {
      embed.addFields({ name: '🤝 Alliances', value: alliances.map(a => `🛡️ ${a.ally_name}`).join('\n'), inline: false });
    }

    embed.setFooter({ text: '🏛️ Informations de guilde' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'list') {
    const guilds = db.getAllGuilds();
    
    if (guilds.length === 0) {
      return interaction.reply('🏛️ Aucune guilde n\'existe pour le moment. Créez la première avec `/guild create` !');
    }

    const embed = new EmbedBuilder()
      .setTitle('🏛️ Guildes de GrokCity')
      .setColor(0x607d8b)
      .setDescription('**Guildes disponibles pour rejoindre :**');

    for (const guild of guilds.slice(0, 10)) {
      const memberCount = db.getGuildMembers(guild.id).length;
      const statusEmoji = guild.status === 'open' ? '🟢' : '🔴';
      embed.addFields({
        name: `${statusEmoji} ${guild.name} (Niveau ${guild.level})`,
        value: `${guild.description}\n👥 ${memberCount} membres • 💰 ${formatCents(guild.treasury)} Ǥ`,
        inline: false
      });
    }

    embed.setFooter({ text: '🏛️ Utilisez /guild join <nom> pour rejoindre une guilde' });

    return interaction.reply({ embeds: [embed] });
  }

  // Les autres sous-commandes nécessitent d'être dans une guilde
  const currentGuild = db.getUserGuild(uid);
  if (!currentGuild) {
    return interaction.reply({ content: '🏛️ Vous devez être membre d\'une guilde pour utiliser cette commande.', ephemeral: true });
  }

  if (sub === 'treasury') {
    const action = interaction.options.getString('action');
    const amount = interaction.options.getNumber('montant');

    if (action === 'view') {
      const recentContributions = db.getGuildContributions(currentGuild.id, 5);
      
      const embed = new EmbedBuilder()
        .setTitle(`💰 Trésor de ${currentGuild.name}`)
        .setColor(0xffc107)
        .setDescription(`**Solde actuel : ${formatCents(currentGuild.treasury)} Ǥ**`)
        .addFields(
          { name: '📊 Statistiques', value: `Niveau: ${currentGuild.level}\nExpérience: ${currentGuild.experience}/${currentGuild.level * 1000}`, inline: true }
        );

      if (recentContributions.length > 0) {
        const contribText = recentContributions.map(c => `<@${c.user_id}>: +${formatCents(c.amount)} Ǥ`).join('\n');
        embed.addFields({ name: '🎯 Contributions Récentes', value: contribText, inline: false });
      }

      embed.setFooter({ text: '💡 Contribuez pour faire progresser votre guilde !' });
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'deposit') {
      if (!amount || amount <= 0) {
        return interaction.reply({ content: '❌ Montant invalide.', ephemeral: true });
      }

      const cents = toCents(amount);
      if (user.balance < cents) {
        return interaction.reply({ content: '💰 Solde insuffisant.', ephemeral: true });
      }

      db.adjustBalance(uid, -cents);
      db.adjustGuildTreasury(currentGuild.id, cents);
      db.addGuildExperience(currentGuild.id, Math.floor(amount / 10));
      db.recordGuildContribution(currentGuild.id, uid, cents);

      const embed = new EmbedBuilder()
        .setTitle('💰 Contribution au Trésor')
        .setColor(0x4caf50)
        .setDescription(`Vous avez contribué **${amount.toFixed(2)} Ǥ** au trésor de **${currentGuild.name}** !`)
        .addFields(
          { name: '🎯 XP Gagnée', value: `+${Math.floor(amount / 10)} XP`, inline: true },
          { name: '💰 Nouveau Trésor', value: `${formatCents(db.getGuild(currentGuild.id).treasury)} Ǥ`, inline: true }
        )
        .setFooter({ text: '🏛️ Merci pour votre contribution !' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'withdraw') {
      const member = db.getGuildMember(currentGuild.id, uid);
      if (member.rank !== 'leader' && member.rank !== 'officer') {
        return interaction.reply({ content: '⚔️ Seuls les leaders et officiers peuvent retirer du trésor.', ephemeral: true });
      }

      if (!amount || amount <= 0) {
        return interaction.reply({ content: '❌ Montant invalide.', ephemeral: true });
      }

      const cents = toCents(amount);
      if (currentGuild.treasury < cents) {
        return interaction.reply({ content: '💰 Trésor insuffisant.', ephemeral: true });
      }

      db.adjustGuildTreasury(currentGuild.id, -cents);
      db.adjustBalance(uid, cents);

      return interaction.reply(`💸 Vous avez retiré **${amount.toFixed(2)} Ǥ** du trésor de la guilde.`);
    }
  }

  if (sub === 'war') {
    const member = db.getGuildMember(currentGuild.id, uid);
    if (member.rank !== 'leader' && member.rank !== 'officer') {
      return interaction.reply({ content: '⚔️ Seuls les leaders et officiers peuvent déclarer la guerre.', ephemeral: true });
    }

    const targetName = interaction.options.getString('cible');
    const targetGuild = db.getGuildByName(targetName);
    
    if (!targetGuild) {
      return interaction.reply({ content: '❌ Guilde cible introuvable.', ephemeral: true });
    }

    if (targetGuild.id === currentGuild.id) {
      return interaction.reply({ content: '🤔 Vous ne pouvez pas déclarer la guerre à votre propre guilde.', ephemeral: true });
    }

    // Vérifier s'il y a déjà une guerre
    const existingWar = db.getWarBetweenGuilds(currentGuild.id, targetGuild.id);
    if (existingWar) {
      return interaction.reply({ content: '⚔️ Une guerre est déjà en cours avec cette guilde.', ephemeral: true });
    }

    // Coût de déclaration de guerre
    const warCost = toCents(10000);
    if (currentGuild.treasury < warCost) {
      return interaction.reply({ content: '💰 Il faut 10,000.00 Ǥ dans le trésor pour déclarer la guerre.', ephemeral: true });
    }

    db.adjustGuildTreasury(currentGuild.id, -warCost);
    db.declareWar(currentGuild.id, targetGuild.id);

    const embed = new EmbedBuilder()
      .setTitle('⚔️ Déclaration de Guerre')
      .setColor(0xf44336)
      .setDescription(`**${currentGuild.name}** déclare officiellement la guerre à **${targetGuild.name}** !`)
      .addFields(
        { name: '💰 Coût', value: '10,000.00 Ǥ', inline: true },
        { name: '⏰ Durée', value: '7 jours', inline: true },
        { name: '🎯 Objectif', value: 'Pillage et domination', inline: true }
      )
      .setFooter({ text: '⚔️ La guerre commence maintenant ! Utilisez /guild attack pour lancer des offensives.' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'attack') {
    const targetName = interaction.options.getString('cible');
    const attackType = interaction.options.getString('type');
    const targetGuild = db.getGuildByName(targetName);
    
    if (!targetGuild) {
      return interaction.reply({ content: '❌ Guilde cible introuvable.', ephemeral: true });
    }

    // Vérifier s'il y a une guerre active
    const war = db.getWarBetweenGuilds(currentGuild.id, targetGuild.id);
    if (!war) {
      return interaction.reply({ content: '⚔️ Vous devez d\'abord déclarer la guerre avec `/guild war`.', ephemeral: true });
    }

    const attackCost = toCents(5000);
    if (currentGuild.treasury < attackCost) {
      return interaction.reply({ content: '💰 Il faut 5,000.00 Ǥ dans le trésor pour lancer une attaque.', ephemeral: true });
    }

    // Calculer le succès de l'attaque (basé sur les niveaux et trésor)
    const attackerPower = currentGuild.level * 100 + Math.floor(currentGuild.treasury / 1000);
    const defenderPower = targetGuild.level * 120 + Math.floor(targetGuild.treasury / 800); // Bonus défensif
    const successChance = Math.min(0.8, Math.max(0.2, attackerPower / (attackerPower + defenderPower)));
    const success = Math.random() < successChance;

    db.adjustGuildTreasury(currentGuild.id, -attackCost);
    db.recordGuildAttack(currentGuild.id, targetGuild.id, attackType, success);

    let resultEmbed;
    
    if (success) {
      let stolenAmount = 0;
      let description = '';
      
      switch (attackType) {
        case 'economic':
          stolenAmount = Math.floor(targetGuild.treasury * 0.1); // 10% du trésor
          description = `Raid économique réussi ! Vous avez pillé **${formatCents(stolenAmount)} Ǥ** !`;
          break;
        case 'sabotage':
          const xpLoss = Math.floor(targetGuild.experience * 0.2);
          db.adjustGuildExperience(targetGuild.id, -xpLoss);
          description = `Sabotage réussi ! **${targetGuild.name}** perd **${xpLoss} XP** !`;
          break;
        case 'treasury':
          stolenAmount = Math.floor(targetGuild.treasury * 0.15); // 15% du trésor
          description = `Vol de trésor réussi ! Vous avez dérobé **${formatCents(stolenAmount)} Ǥ** !`;
          break;
      }

      if (stolenAmount > 0) {
        db.adjustGuildTreasury(targetGuild.id, -stolenAmount);
        db.adjustGuildTreasury(currentGuild.id, stolenAmount);
      }

      resultEmbed = new EmbedBuilder()
        .setTitle('⚔️ Attaque Réussie !')
        .setColor(0x4caf50)
        .setDescription(description)
        .addFields(
          { name: '🎯 Cible', value: targetGuild.name, inline: true },
          { name: '💰 Coût', value: '5,000.00 Ǥ', inline: true },
          { name: '🏆 Butin', value: stolenAmount > 0 ? `${formatCents(stolenAmount)} Ǥ` : 'Dégâts stratégiques', inline: true }
        );
    } else {
      resultEmbed = new EmbedBuilder()
        .setTitle('⚔️ Attaque Échouée')
        .setColor(0xf44336)
        .setDescription(`Votre attaque contre **${targetGuild.name}** a échoué ! Leurs défenses étaient trop solides.`)
        .addFields(
          { name: '💰 Coût', value: '5,000.00 Ǥ', inline: true },
          { name: '📊 Chance de Succès', value: `${(successChance * 100).toFixed(1)}%`, inline: true }
        );
    }

    resultEmbed.setFooter({ text: '⚔️ La guerre continue... Préparez votre prochaine offensive !' })
      .setTimestamp();

    return interaction.reply({ embeds: [resultEmbed] });
  }

  if (sub === 'defend') {
    const defenseType = interaction.options.getString('type');
    const member = db.getGuildMember(currentGuild.id, uid);
    
    if (member.rank !== 'leader' && member.rank !== 'officer') {
      return interaction.reply({ content: '⚔️ Seuls les leaders et officiers peuvent organiser la défense.', ephemeral: true });
    }

    const defenseCost = toCents(3000);
    if (currentGuild.treasury < defenseCost) {
      return interaction.reply({ content: '💰 Il faut 3,000.00 Ǥ dans le trésor pour organiser la défense.', ephemeral: true });
    }

    db.adjustGuildTreasury(currentGuild.id, -defenseCost);
    db.activateGuildDefense(currentGuild.id, defenseType, 24); // 24h de défense

    let defenseDescription = '';
    switch (defenseType) {
      case 'fortify':
        defenseDescription = '🏰 Fortifications renforcées ! +30% résistance aux attaques pendant 24h.';
        break;
      case 'counter_spy':
        defenseDescription = '🕵️ Contre-espionnage activé ! Protection contre l\'infiltration pendant 24h.';
        break;
      case 'guard':
        defenseDescription = '🛡️ Garde renforcée ! +50% protection du trésor pendant 24h.';
        break;
    }

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Défense Organisée')
      .setColor(0x2196f3)
      .setDescription(defenseDescription)
      .addFields(
        { name: '💰 Coût', value: '3,000.00 Ǥ', inline: true },
        { name: '⏰ Durée', value: '24 heures', inline: true },
        { name: '🎯 Effet', value: 'Protection renforcée', inline: true }
      )
      .setFooter({ text: '🛡️ Votre guilde est maintenant mieux protégée !' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'spy') {
    const targetName = interaction.options.getString('cible');
    const targetGuild = db.getGuildByName(targetName);
    
    if (!targetGuild) {
      return interaction.reply({ content: '❌ Guilde cible introuvable.', ephemeral: true });
    }

    if (targetGuild.id === currentGuild.id) {
      return interaction.reply({ content: '🤔 Vous ne pouvez pas espionner votre propre guilde.', ephemeral: true });
    }

    const spyCost = toCents(2000);
    if (user.balance < spyCost) {
      return interaction.reply({ content: '💰 Il faut 2,000.00 Ǥ pour lancer une mission d\'espionnage.', ephemeral: true });
    }

    // Vérifier les défenses anti-espionnage
    const hasCounterSpy = db.hasActiveDefense(targetGuild.id, 'counter_spy');
    const successChance = hasCounterSpy ? 0.3 : 0.7;
    const success = Math.random() < successChance;

    db.adjustBalance(uid, -spyCost);

    if (success) {
      const members = db.getGuildMembers(targetGuild.id);
      const recentAttacks = db.getGuildRecentAttacks(targetGuild.id, 3);
      
      const embed = new EmbedBuilder()
        .setTitle('🕵️ Mission d\'Espionnage Réussie')
        .setColor(0x4caf50)
        .setDescription(`Informations secrètes sur **${targetGuild.name}** :`)
        .addFields(
          { name: '💰 Trésor Estimé', value: `~${formatCents(Math.floor(targetGuild.treasury * 0.9))} - ${formatCents(Math.floor(targetGuild.treasury * 1.1))} Ǥ`, inline: true },
          { name: '👥 Membres Actifs', value: `${members.length}`, inline: true },
          { name: '⭐ Niveau', value: `${targetGuild.level}`, inline: true },
          { name: '🛡️ Défenses', value: hasCounterSpy ? '🔴 Actives' : '🟢 Faibles', inline: true }
        );

      if (recentAttacks.length > 0) {
        embed.addFields({ name: '⚔️ Activité Récente', value: `${recentAttacks.length} attaque(s) dans les dernières 24h`, inline: true });
      }

      embed.setFooter({ text: '🕵️ Informations obtenues discrètement' });
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('🕵️ Mission d\'Espionnage Échouée')
        .setColor(0xf44336)
        .setDescription(`Votre espion a été découvert par **${targetGuild.name}** ! Mission compromise.`)
        .addFields(
          { name: '💰 Coût', value: '2,000.00 Ǥ', inline: true },
          { name: '🛡️ Cause', value: hasCounterSpy ? 'Contre-espionnage actif' : 'Malchance', inline: true }
        )
        .setFooter({ text: '🕵️ Réessayez plus tard...' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  if (sub === 'alliance') {
    const member = db.getGuildMember(currentGuild.id, uid);
    if (member.rank !== 'leader') {
      return interaction.reply({ content: '👑 Seuls les leaders peuvent proposer des alliances.', ephemeral: true });
    }

    const targetName = interaction.options.getString('cible');
    const targetGuild = db.getGuildByName(targetName);
    
    if (!targetGuild) {
      return interaction.reply({ content: '❌ Guilde cible introuvable.', ephemeral: true });
    }

    if (targetGuild.id === currentGuild.id) {
      return interaction.reply({ content: '🤔 Vous ne pouvez pas faire alliance avec votre propre guilde.', ephemeral: true });
    }

    // Vérifier s'il y a déjà une alliance ou une guerre
    const existingAlliance = db.getAllianceBetweenGuilds(currentGuild.id, targetGuild.id);
    const existingWar = db.getWarBetweenGuilds(currentGuild.id, targetGuild.id);
    
    if (existingAlliance) {
      return interaction.reply({ content: '🤝 Une alliance existe déjà avec cette guilde.', ephemeral: true });
    }

    if (existingWar) {
      return interaction.reply({ content: '⚔️ Vous ne pouvez pas faire alliance avec une guilde en guerre.', ephemeral: true });
    }

    db.proposeAlliance(currentGuild.id, targetGuild.id);

    const embed = new EmbedBuilder()
      .setTitle('🤝 Proposition d\'Alliance')
      .setColor(0x2196f3)
      .setDescription(`**${currentGuild.name}** propose une alliance à **${targetGuild.name}** !`)
      .addFields(
        { name: '🎯 Avantages', value: '• Protection mutuelle\n• Bonus commerciaux\n• Partage d\'informations', inline: false },
        { name: '⏰ Statut', value: '⏳ En attente d\'acceptation', inline: true }
      )
      .setFooter({ text: '🤝 En attente de la réponse du leader adverse...' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // Autres commandes...
  return interaction.reply({ content: '🚧 Fonctionnalité en développement.', ephemeral: true });
}