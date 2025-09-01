import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('start')

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const user = db.getUser(uid);
  
  const embed = new EmbedBuilder()
    .setTitle('💎 Bienvenue dans GrokCity !')
    .setColor(0x00ff88)
    .setDescription(
      `**Salut ${interaction.user.username} !** 👋\n\n` +
      `Vous venez de rejoindre la ville la plus prospère du monde virtuel !\n\n` +
      `**Votre capital de départ :** ${(user.balance / 100).toFixed(2)} Ǥ\n\n` +
      `**🚀 Que faire maintenant ?**\n` +
      `💼 `/job` - Choisir un métier prestigieux\n` +
      `₿ `/crypto` - Trader du BitGrok\n` +
      `🏠 `/immo` - Investir dans l'immobilier\n` +
      `🎰 `/casino` - Tenter votre chance\n` +
      `📊 `/dashboard` - Votre tableau de bord\n` +
      `📖 `/guide` - Guide interactif complet`
    )
    .setImage('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400')
    .setFooter({ text: '💎 GrokCity • Votre empire commence ici' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}