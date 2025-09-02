import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatCents } from '../utils/money.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('🚀 Commencer votre aventure dans GrokCity');

export async function execute(interaction, db, config) {
  try {
    const uid = interaction.user.id;
    
    // Vérifier que l'utilisateur existe et le créer si nécessaire
    let user;
    try {
      user = await db.getUser(uid);
    } catch (error) {
      console.error('Erreur getUser dans start:', error);
      return interaction.reply({ 
        content: '❌ Erreur lors de la création de votre compte. Réessayez dans quelques secondes.', 
        flags: 64 
      });
    }

    if (!user) {
      return interaction.reply({ 
        content: '❌ Impossible de créer votre compte. Contactez un administrateur.', 
        flags: 64 
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('💎 Bienvenue dans GrokCity !')
      .setColor(0x00ff88)
      .setDescription(
        `**Salut ${interaction.user.username} !** 👋\n\n` +
        `Vous venez de rejoindre la ville la plus prospère du monde virtuel !\n\n` +
        `**Votre capital de départ :** ${formatCents(user.balance)} Ǥ\n\n` +
        `**🚀 Que faire maintenant ?**\n` +
        `💼 \`/job\` - Choisir un métier prestigieux\n` +
        `₿ \`/crypto\` - Trader du BitGrok\n` +
        `🏠 \`/immo\` - Investir dans l'immobilier\n` +
        `🎰 \`/casino\` - Tenter votre chance\n` +
        `📊 \`/dashboard\` - Votre tableau de bord\n` +
        `📖 \`/guide\` - Guide interactif complet`
      )
      .setImage('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400')
      .setFooter({ text: '💎 GrokCity • Votre empire commence ici' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Erreur commande start:', error);
    
    return interaction.reply({ 
      content: '❌ Une erreur est survenue lors de l\'initialisation. Réessayez dans quelques secondes.', 
      flags: 64 
    });
  }
}