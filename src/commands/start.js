import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { formatGrokCoin, SYMBOLS, COLORS } from '../utils/symbols.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('🚀 Commencer votre aventure dans GrokCity');

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  
  const embed = new EmbedBuilder()
    .setTitle(`${SYMBOLS.DIAMOND} Bienvenue dans GrokCity !`)
    .setColor(COLORS.SUCCESS)
    .setDescription(`**Salut ${interaction.user.username} !** 👋\n\nVous venez de rejoindre la ville la plus prospère du monde virtuel !\n\n${SYMBOLS.GROKCOIN} **Votre capital de départ :** ${formatGrokCoin(user.balance)}`)
    .addFields(
      { 
        name: `${SYMBOLS.ROCKET} Que faire maintenant ?`, 
        value: `${SYMBOLS.BRIEFCASE} Choisir un **métier** prestigieux\n${SYMBOLS.BITGROK} Trader du **BitGrok**\n${SYMBOLS.HOUSE} Investir dans l'**immobilier**\n${SYMBOLS.CASINO} Tenter votre chance au **casino**`, 
        inline: false 
      }
    )
    .setImage('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400')
    .setFooter({ text: '💎 GrokCity • Votre empire commence ici', iconURL: 'https://images.pexels.com/photos/844124/pexels-photo-844124.jpeg?auto=compress&cs=tinysrgb&w=32&h=32' })
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('quick_profile')
        .setLabel('Mon Profil')
        .setStyle(ButtonStyle.Primary)
        .setEmoji(SYMBOLS.WALLET),
      new ButtonBuilder()
        .setCustomId('quick_job')
        .setLabel('Travailler')
        .setStyle(ButtonStyle.Success)
        .setEmoji(SYMBOLS.BRIEFCASE),
      new ButtonBuilder()
        .setCustomId('quick_crypto')
        .setLabel('BitGrok')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(SYMBOLS.BITGROK),
      new ButtonBuilder()
        .setCustomId('quick_casino')
        .setLabel('Casino')
        .setStyle(ButtonStyle.Danger)
        .setEmoji(SYMBOLS.CASINO)
    );

  await interaction.reply({ embeds: [embed], components: [row] });
}