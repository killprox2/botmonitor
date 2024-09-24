const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

const roleAssignments = {
  '💰': 'ID_DU_ROLE_EDP',
  '📦': 'ID_DU_ROLE_AUTRE_VENDEUR',
  '🟢': 'ID_DU_ROLE_2EURO',
  '🔵': 'ID_DU_ROLE_1EURO',
  '🔥': 'ID_DU_ROLE_PROMO',
  '⚡': 'ID_DU_ROLE_VENTE_FLASH'
};

const channelMentions = {
  'EDP': '<@&ID_DU_ROLE_EDP>',
  'Autre_vendeur': '<@&ID_DU_ROLE_AUTRE_VENDEUR>',
  '2euro': '<@&ID_DU_ROLE_2EURO>',
  '1euro': '<@&ID_DU_ROLE_1EURO>',
  'promo': '<@&ID_DU_ROLE_PROMO>',
  'vente_flash': '<@&ID_DU_ROLE_VENTE_FLASH>',
  'logs': '1285977835365994506'
};

const AMAZON_URLS = [
  'https://www.amazon.fr/s?k=promo',
  'https://www.amazon.fr/s?k=electronique',
  'https://www.amazon.fr/s?k=jouets',
  'https://www.amazon.fr/s?k=ventes+flash'
];

const PRICE_THRESHOLD = 2;
const PRICE_THRESHOLD_1_EURO = 1;
const PROMO_THRESHOLD = 5;
const EDP_THRESHOLD = 90;
const CACHE_EXPIRY_TIME = 60 * 60 * 1000;
const MIN_CHECK_INTERVAL = 300000;
const MAX_CHECK_INTERVAL = 600000; // Intervalle maximum pour ajouter un délai aléatoire

const productCache = new Map();
const dealWatchList = new Map();
const logsChannelId = '1285977835365994506';

function addProductToCache(url) {
  productCache.set(url, Date.now());
  setTimeout(() => productCache.delete(url), CACHE_EXPIRY_TIME);
}

function isProductInCache(url) {
  return productCache.has(url);
}

function getRandomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

client.on('messageCreate', async (message) => {
  if (message.content === '-role') {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Sélection de rôles')
      .setDescription(`Cliquez sur les emojis ci-dessous pour obtenir des notifications :
        💰 - Erreur de prix (EDP)
        📦 - Autres vendeurs
        🟢 - Produits à moins de 2€
        🔵 - Produits à moins de 1€
        🔥 - Promotions
        ⚡ - Ventes Flash`);

    const roleMessage = await message.channel.send({ embeds: [embed] });
    await roleMessage.react('💰');
    await roleMessage.react('📦');
    await roleMessage.react('🟢');
    await roleMessage.react('🔵');
    await roleMessage.react('🔥');
    await roleMessage.react('⚡');
  }

  if (message.content.startsWith('-add_deal')) {
    const args = message.content.split(' ');
    const productUrl = args[1];
    const maxPrice = parseFloat(args[2]);

    if (!productUrl || isNaN(maxPrice)) {
      message.channel.send('Usage: `-add_deal <url> <prix_max>`');
      return;
    }

    try {
      new URL(productUrl); // Validation de l'URL
      dealWatchList.set(productUrl, maxPrice);
      message.channel.send(`Produit ajouté à la surveillance : ${productUrl} avec un prix maximum de ${maxPrice}€`);
      logMessage(`Produit ajouté à la surveillance manuelle: ${productUrl} avec un prix max de ${maxPrice}€`);
    } catch (error) {
      message.channel.send('URL invalide. Veuillez vérifier le lien.');
    }
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  const roleId = roleAssignments[reaction.emoji.name];
  if (roleId) {
    const member = await reaction.message.guild.members.fetch(user.id);
    const role = reaction.message.guild.roles.cache.get(roleId);
    if (role) await member.roles.add(role);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  const roleId = roleAssignments[reaction.emoji.name];
  if (roleId) {
    const member = await reaction.message.guild.members.fetch(user.id);
    const role = reaction.message.guild.roles.cache.get(roleId);
    if (role) await member.roles.remove(role);
  }
});

client.once('ready', () => {
  logMessage(`Bot connecté en tant que ${client.user.tag}`);
  monitorAmazonProducts();
  monitorDeals();
});

async function fetchAmazonPage(url, retries = 0) {
  if (!url || url.trim() === '') {
    logMessage(`Erreur: URL vide ou incorrecte: ${url}`);
    return null;
  }

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    }
  };

  try {
    const { data } = await axios.get(url, options);
    return data;
  } catch (error) {
    logMessage(`Erreur lors de la récupération de ${url}, tentative ${retries + 1}: ${error.message}`);
    if (retries < 5) {
      await new Promise(resolve => setTimeout(resolve, getRandomInterval(5000, 10000))); // Attendre 5 à 10 secondes avant de réessayer
      return fetchAmazonPage(url, retries + 1);
    }
    logMessage(`Échec après plusieurs tentatives pour accéder à ${url}: ${error.message}`);
    return null;
  }
}

async function monitorAmazonProducts() {
  for (const url of AMAZON_URLS) {
    if (!url || url.trim() === '') {
      logMessage('URL vide ou incorrecte ignorée');
      continue;
    }

    try {
      const html = await fetchAmazonPage(url);
      if (!html) continue;

      const $ = cheerio.load(html);

      $('.s-main-slot .s-result-item').each(async (i, element) => {
        const productTitle = $(element).find('h2 a span').text();
        const priceText = $(element).find('.a-price-whole').text();
        const price = parseFloat(priceText.replace(',', '.'));
        const oldPriceText = $(element).find('.a-text-price .a-offscreen').first().text();
        const oldPrice = parseFloat(oldPriceText.replace(',', '.'));
        const productUrl = 'https://www.amazon.fr' + $(element).find('h2 a').attr('href');
        const productImage = $(element).find('img').attr('src');

        let shippingCost = 0;
        const shippingText = $(element).find('.a-color-secondary .a-size-small').text();
        if (shippingText.toLowerCase().includes('livraison')) {
          const shippingCostText = shippingText.match(/(\d+,\d+)/);
          if (shippingCostText) shippingCost = parseFloat(shippingCostText[0].replace(',', '.'));
        }
        const totalPrice = price + shippingCost;

        if (!isProductInCache(productUrl) && totalPrice && oldPrice) {
          const discountPercentage = ((oldPrice - totalPrice) / oldPrice) * 100;

          if (discountPercentage >= PROMO_THRESHOLD) {
            sendProductToChannel(productTitle, totalPrice, oldPrice, discountPercentage, productUrl, productImage, 'promo');
          }
          if (totalPrice <= PRICE_THRESHOLD) {
            sendProductToChannel(productTitle, totalPrice, oldPrice, discountPercentage, productUrl, productImage, '2euro');
          }
          if (totalPrice <= PRICE_THRESHOLD_1_EURO) {
            sendProductToChannel(productTitle, totalPrice, oldPrice, discountPercentage, productUrl, productImage, '1euro');
          }
          if (discountPercentage >= EDP_THRESHOLD) {
            sendProductToChannel(productTitle, totalPrice, oldPrice, discountPercentage, productUrl, productImage, 'EDP');
          }

          const flashDealText = $(element).find('.dealBadge').text();
          if (flashDealText.toLowerCase().includes('vente flash')) {
            sendProductToChannel(productTitle, totalPrice, oldPrice, discountPercentage, productUrl, productImage, 'vente_flash');
          }

          addProductToCache(productUrl);
        }
      });
    } catch (error) {
      logMessage(`Erreur lors de la récupération des produits: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, getRandomInterval(MIN_CHECK_INTERVAL, MAX_CHECK_INTERVAL))); // Ajout d'un délai aléatoire entre les requêtes
  }
}

async function monitorDeals() {
  setInterval(async () => {
    for (const [url, maxPrice] of dealWatchList.entries()) {
      try {
        const html = await fetchAmazonPage(url);
        if (!html) continue;

        const $ = cheerio.load(html);
        const priceText = $('.a-price-whole').first().text();
        const price = parseFloat(priceText.replace(',', '.'));
        if (price <= maxPrice) {
          sendProductToChannel('Produit surveillé', price, maxPrice, 0, url, '', 'deal');
        }
      } catch (error) {
        logMessage(`Erreur lors de la surveillance des deals: ${error.message}`);
      }
    }
  }, MIN_CHECK_INTERVAL);
}

function sendProductToChannel(title, price, oldPrice, discountPercentage, url, image, category) {
  const channelId = {
    'EDP': '1285953900066902057',
    'promo': '1285969661535453215',
    '2euro': '1285939619598172232',
    '1euro': '1255863140974071893',
    'Autre_vendeur': '1285974003307118644',
    'deal': '1285955371252580352',
    'vente_flash': 'ID_DU_SALON_VENTE_FLASH'
  }[category];

  const channel = client.channels.cache.get(channelId);
  if (channel) {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(title)
      .setURL(url)
      .setDescription(discountPercentage > 0 ? `Réduction de ${Math.round(discountPercentage)}%` : '')
      .setThumbnail(image)
      .addFields(
        { name: 'Prix actuel', value: `${price}€`, inline: true },
        { name: 'Prix habituel', value: `${oldPrice}€`, inline: true },
        { name: 'Lien', value: `[Acheter maintenant](${url})`, inline: true }
      )
      .setTimestamp();

    channel.send({ embeds: [embed] });
  }
}

function logMessage(message) {
  const logsChannel = client.channels.cache.get(logsChannelId);
  if (logsChannel) {
    logsChannel.send(message);
  } else {
    console.log(`Logs: ${message}`);
  }
}

client.login(process.env.TOKEN);
