import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('🚀 Commencer votre aventure dans GrokCity');

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  
  const embed = new EmbedBuilder()
    .setTitle('💎 Bienvenue dans GrokCity !')
    .setColor(0x00ff88)
    .setDescription(`**Salut ${interaction.user.username} !** 👋\n\nVous venez de rejoindre la ville la plus prospère du monde virtuel !\n\n**Votre capital de départ :** ${(user.balance / 100).toFixed(2)} Ǥ`)
    .addFields(
      { 
        name: '🚀 Que faire maintenant ?', 
        value: '💼 Choisir un **métier** prestigieux\n₿ Trader du **BitGrok**\n🏠 Investir dans l\'**immobilier**\n🎰 Tenter votre chance au **casino**', 
        inline: false 
      }
    )
    .setImage('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400')
    .setFooter({ text: '💎 GrokCity • Votre empire commence ici' })
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('quick_profile')
        .setLabel('Mon Profil')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('quick_job')
        .setLabel('Travailler')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('quick_crypto')
        .setLabel('BitGrok')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('quick_casino')
        .setLabel('Casino')
        .setStyle(ButtonStyle.Danger)
    );

  // Use editReply if deferred, otherwise reply
  const response = interaction.deferred 
    ? await interaction.editReply({ embeds: [embed], components: [row] })
    : await interaction.reply({ embeds: [embed], components: [row] });

  // Handle button interactions
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.user.id !== uid) {
      return i.reply({ content: 'Ce menu n\'est pas pour vous !', flags: 64 });
    }

    const action = i.customId.split('_')[1];
    let commandName = '';
    
    switch (action) {
      case 'profile': commandName = 'profil'; break;
      case 'job': commandName = 'job'; break;
      case 'crypto': commandName = 'crypto'; break;
      case 'casino': commandName = 'casino'; break;
    }

    await i.reply({ content: `🚀 Utilisez la commande \`/${commandName}\` pour accéder à cette section !`, flags: 64 });
  });

  collector.on('end', () => {
    // Remove buttons after timeout
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        ...row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
      );
    
    if (interaction.deferred) {
      interaction.editReply({ embeds: [embed], components: [disabledRow] }).catch(() => {});
    }
  });
}