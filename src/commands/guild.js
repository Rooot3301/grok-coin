import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { formatCents, toCents } from '../utils/money.js';

export const data = new SlashCommandBuilder()
  .setName('guild')
  .setDescription('Système de guildes et alliances')
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
    .setDescription('Expulser un membre (leaders seulement)')
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
      return interaction.reply({ content: 'Vous êtes déjà membre d\'une guilde. Quittez-la d\'abord avec `/guild leave`.', ephemeral: true });
    }

    // Vérifier si le nom est disponible
    if (db.getGuildByName(name)) {
      return interaction.reply({ content: 'Ce nom de guilde est déjà pris.', ephemeral: true });
    }

    // Coût de création
    const creationCost = toCents(5000);
    if (user.balance < creationCost) {
      return interaction.reply({ content: 'Il faut 50.00 GKC pour créer une guilde.', ephemeral: true });
    }

    db.adjustBalance(uid, -creationCost);
    const guildId = db.createGuild(name, description, uid);
    
    const embed = new EmbedBuilder()
      .setTitle('🏛️ Guilde créée')
      .setColor(0x4caf50)
      .setDescription(`**${name}** a été créée avec succès !\n\n*${description}*`)
      .addFields(
        { name: 'Leader', value: `<@${uid}>`, inline: true },
        { name: 'Membres', value: '1', inline: true },
        { name: 'Trésor', value: '0.00 GKC', inline: true }
      );
    
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'join') {
    const guildName = interaction.options.getString('nom');
    const guild = db.getGuildByName(guildName);
    
    if (!guild) {
      return interaction.reply({ content: 'Guilde introuvable.', ephemeral: true });
    }

    const currentGuild = db.getUserGuild(uid);
    if (currentGuild) {
      return interaction.reply({ content: 'Vous êtes déjà membre d\'une guilde.', ephemeral: true });
    }

    // Vérifier si la guilde accepte de nouveaux membres
    if (guild.status === 'closed') {
      return interaction.reply({ content: 'Cette guilde n\'accepte pas de nouveaux membres.', ephemeral: true });
    }

    db.joinGuild(uid, guild.id);
    
    const embed = new EmbedBuilder()
      .setTitle('🤝 Bienvenue dans la guilde')
      .setColor(0x2196f3)
      .setDescription(`Vous avez rejoint **${guild.name}** !\n\n*${guild.description}*`);
    
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'leave') {
    const currentGuild = db.getUserGuild(uid);
    if (!currentGuild) {
      return interaction.reply({ content: 'Vous n\'êtes membre d\'aucune guilde.', ephemeral: true });
    }

    if (currentGuild.leader_id === uid) {
      return interaction.reply({ content: 'En tant que leader, vous devez transférer le leadership avant de quitter la guilde.', ephemeral: true });
    }

    db.leaveGuild(uid);
    return interaction.reply(`Vous avez quitté la guilde **${currentGuild.name}**.`);
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
      return interaction.reply({ content: 'Guilde introuvable.', ephemeral: true });
    }

    const members = db.getGuildMembers(guild.id);
    const leader = members.find(m => m.user_id === guild.leader_id);
    const officers = members.filter(m => m.rank === 'officer');
    const wars = db.getGuildWars(guild.id);
    const alliances = db.getGuildAlliances(guild.id);

    const embed = new EmbedBuilder()
      .setTitle(`🏛️ ${guild.name}`)
      .setColor(0x9c27b0)
      .setDescription(guild.description)
      .addFields(
        { name: 'Leader', value: `<@${guild.leader_id}>`, inline: true },
        { name: 'Membres', value: `${members.length}`, inline: true },
        { name: 'Trésor', value: `${formatCents(guild.treasury)} GKC`, inline: true },
        { name: 'Niveau', value: `${guild.level}`, inline: true },
        { name: 'Expérience', value: `${guild.experience}/${guild.level * 1000}`, inline: true },
        { name: 'Statut', value: guild.status === 'open' ? '🟢 Ouvert' : '🔴 Fermé', inline: true }
      );

    if (officers.length > 0) {
      embed.addFields({ name: 'Officiers', value: officers.map(o => `<@${o.user_id}>`).join(', '), inline: false });
    }

    if (wars.length > 0) {
      embed.addFields({ name: 'Guerres en cours', value: wars.map(w => w.target_name).join(', '), inline: false });
    }

    if (alliances.length > 0) {
      embed.addFields({ name: 'Alliances', value: alliances.map(a => a.ally_name).join(', '), inline: false });
    }

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'list') {
    const guilds = db.getAllGuilds();
    
    if (guilds.length === 0) {
      return interaction.reply('Aucune guilde n\'existe pour le moment.');
    }

    const embed = new EmbedBuilder()
      .setTitle('🏛️ Guildes disponibles')
      .setColor(0x607d8b);

    for (const guild of guilds.slice(0, 10)) {
      const memberCount = db.getGuildMembers(guild.id).length;
      embed.addFields({
        name: `${guild.name} (Niveau ${guild.level})`,
        value: `${guild.description}\n👥 ${memberCount} membres • 💰 ${formatCents(guild.treasury)} GKC`,
        inline: false
      });
    }

    return interaction.reply({ embeds: [embed] });
  }

  // Les autres sous-commandes nécessitent d'être dans une guilde
  const currentGuild = db.getUserGuild(uid);
  if (!currentGuild) {
    return interaction.reply({ content: 'Vous devez être membre d\'une guilde pour utiliser cette commande.', ephemeral: true });
  }

  if (sub === 'treasury') {
    const action = interaction.options.getString('action');
    const amount = interaction.options.getNumber('montant');

    if (action === 'view') {
      const embed = new EmbedBuilder()
        .setTitle(`💰 Trésor de ${currentGuild.name}`)
        .setColor(0xffc107)
        .setDescription(`Solde actuel : **${formatCents(currentGuild.treasury)} GKC**`)
        .addFields(
          { name: 'Contributions récentes', value: 'Fonctionnalité à venir', inline: false }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'deposit') {
      if (!amount || amount <= 0) {
        return interaction.reply({ content: 'Montant invalide.', ephemeral: true });
      }

      const cents = toCents(amount);
      if (user.balance < cents) {
        return interaction.reply({ content: 'Solde insuffisant.', ephemeral: true });
      }

      db.adjustBalance(uid, -cents);
      db.adjustGuildTreasury(currentGuild.id, cents);
      db.addGuildExperience(currentGuild.id, Math.floor(amount / 10));

      return interaction.reply(`💰 Vous avez déposé **${amount.toFixed(2)} GKC** dans le trésor de la guilde.`);
    }

    if (action === 'withdraw') {
      const member = db.getGuildMember(currentGuild.id, uid);
      if (member.rank !== 'leader' && member.rank !== 'officer') {
        return interaction.reply({ content: 'Seuls les leaders et officiers peuvent retirer du trésor.', ephemeral: true });
      }

      if (!amount || amount <= 0) {
        return interaction.reply({ content: 'Montant invalide.', ephemeral: true });
      }

      const cents = toCents(amount);
      if (currentGuild.treasury < cents) {
        return interaction.reply({ content: 'Trésor insuffisant.', ephemeral: true });
      }

      db.adjustGuildTreasury(currentGuild.id, -cents);
      db.adjustBalance(uid, cents);

      return interaction.reply(`💸 Vous avez retiré **${amount.toFixed(2)} GKC** du trésor de la guilde.`);
    }
  }

  // Autres commandes nécessitant des permissions spéciales...
  return interaction.reply({ content: 'Fonctionnalité en développement.', ephemeral: true });
}