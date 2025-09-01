import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { formatGrokCoin, SYMBOLS, COLORS } from '../utils/symbols.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('🚀 Commencer votre aventure dans GrokCity');

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  
  const embed = new EmbedBuilder()
    .setTitle(`💎 Bienvenue dans GrokCity !`)
    .setColor(COLORS.SUCCESS)
    .setDescription(`**Salut ${interaction.user.username} !** 👋\n\nVous venez de rejoindre la ville la plus prospère du monde virtuel !\n\n**Votre capital de départ :** ${formatGrokCoin(user.balance)}`)
    .addFields(
      { 
        name: `🚀 Que faire maintenant ?`, 
        value: `💼 Choisir un **métier** prestigieux\n₿ Trader du **BitGrok**\n🏠 Investir dans l'**immobilier**\n🎰 Tenter votre chance au **casino**`, 
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

  await interaction.reply({ embeds: [embed], components: [row] });
}