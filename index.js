const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config(); // Utilisation des variables d'environnement pour le token

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

client.login(process.env.TOKEN);

// Rôles et salons
const roles = {
    owner: 'OwnerRoleID',
    modo: 'ModoRoleID',
    preniumPlus: 'PreniumPlusRoleID',
    prenium: 'PreniumRoleID',
    visiteur: 'VisiteurRoleID',
};

const channels = {
    amazon: '1255863140974071893', // Salon général Amazon
    cdiscount: '1285939619598172232', // Salon Cdiscount
    auchan: '1285969661535453215', // Salon Auchan
    manomano: '1285953900066902057', // Salon Manomano
    electromenager: 'ElectromenagerChannelID',
    livre: 'LivreChannelID',
    enfant: 'EnfantChannelID',
    jouet: 'JouetChannelID',
    entretien: 'EntretienChannelID',
    electronique: 'ElectroniqueChannelID',
    logs: '1285977835365994506', // Salon de logs
};

// Fonction pour envoyer des messages dans le salon de logs
function sendLogMessage(content) {
    const logChannel = client.channels.cache.get(channels.logs);
    if (logChannel) {
        logChannel.send(content);
    } else {
        console.log('Salon de logs introuvable.');
    }
}

// Logs au démarrage du bot
client.once('ready', () => {
    console.log('Bot is online!');
    sendLogMessage('✅ Bot démarré et prêt à l\'emploi.');
});

// ===================== RECHERCHE AMAZON =====================

// Recherche générale sur Amazon (promotions supérieures à 70%, ventes flash, autres vendeurs)
async function checkAmazonGeneralDeals() {
    try {
        sendLogMessage('🔎 Recherche de deals Amazon général...');
        const { data } = await axios.get('https://www.amazon.fr/deals');
        const $ = cheerio.load(data); // Charger la page HTML avec Cheerio

        const deals = [];
        $('.dealContainer').each((i, el) => {
            const title = $(el).find('.dealTitle').text().trim();
            const currentPrice = $(el).find('.dealPrice').text().trim();
            const oldPrice = $(el).find('.dealOldPrice').text().trim();
            const discount = $(el).find('.dealDiscount').text().trim();
            const url = 'https://www.amazon.fr' + $(el).find('a').attr('href');

            const discountPercentage = calculateDiscount(currentPrice, oldPrice);
            if (discountPercentage >= 70 || multipleCouponsAvailable(el) || isFlashSale(el)) {
                deals.push({ title, currentPrice, oldPrice, discount, url });
            }
        });

        if (deals.length > 0) {
            sendLogMessage(`📦 ${deals.length} deals trouvés sur Amazon général.`);
        } else {
            sendLogMessage('❌ Aucun deal trouvé sur Amazon général.');
        }

        deals.forEach(deal => {
            const embed = new EmbedBuilder()
                .setTitle(deal.title)
                .setURL(deal.url)
                .addFields(
                    { name: 'Prix actuel', value: deal.currentPrice, inline: true },
                    { name: 'Prix avant', value: deal.oldPrice, inline: true },
                    { name: 'Réduction', value: deal.discount, inline: true }
                )
                .setFooter({ text: 'Amazon Deal' });

            client.channels.cache.get(channels.amazon).send({ embeds: [embed] });
            sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount}%)`);
        });
    } catch (error) {
        sendLogMessage('⚠️ Erreur lors de la recherche des deals Amazon général.');
        console.error('Erreur lors de la recherche des deals Amazon général:', error);
    }
}

// Recherche avancée pour les salons spécifiques (promotions avec 60% de réduction minimum)
async function checkAmazonAdvancedDeals() {
    try {
        sendLogMessage('🔎 Recherche de deals avancés Amazon...');
        const { data } = await axios.get('https://www.amazon.fr/deals');
        const $ = cheerio.load(data); // Charger la page HTML avec Cheerio

        const deals = [];
        $('.dealContainer').each((i, el) => {
            const title = $(el).find('.dealTitle').text().trim();
            const currentPrice = $(el).find('.dealPrice').text().trim();
            const oldPrice = $(el).find('.dealOldPrice').text().trim();
            const url = 'https://www.amazon.fr' + $(el).find('a').attr('href');

            const discountPercentage = calculateDiscount(currentPrice, oldPrice);
            if (discountPercentage >= 60) {
                const category = determineCategory(title); // Déterminer la catégorie du produit
                deals.push({ title, currentPrice, oldPrice, discount: `${discountPercentage}%`, url, category });
            }
        });

        if (deals.length > 0) {
            sendLogMessage(`📦 ${deals.length} deals avancés trouvés sur Amazon.`);
        } else {
            sendLogMessage('❌ Aucun deal avancé trouvé sur Amazon.');
        }

        deals.forEach(deal => {
            const embed = new EmbedBuilder()
                .setTitle(deal.title)
                .setURL(deal.url)
                .addFields(
                    { name: 'Prix actuel', value: deal.currentPrice, inline: true },
                    { name: 'Prix avant', value: deal.oldPrice, inline: true },
                    { name: 'Réduction', value: deal.discount, inline: true }
                )
                .setFooter({ text: 'Amazon Advanced Deal' });

            const channelId = channels[deal.category];
            if (channelId) {
                client.channels.cache.get(channelId).send({ embeds: [embed] });
                sendLogMessage(`📌 Produit ajouté dans ${deal.category} : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount}%)`);
            }
        });
    } catch (error) {
        sendLogMessage('⚠️ Erreur lors de la recherche des deals avancés Amazon.');
        console.error('Erreur lors de la recherche des deals avancés Amazon:', error);
    }
}

// ===================== RECHERCHE CDISCOUNT =====================

async function checkCdiscountDeals() {
    try {
        sendLogMessage('🔎 Recherche de deals Cdiscount...');
        const { data } = await axios.get('https://www.cdiscount.com/');
        const $ = cheerio.load(data); // Charger la page HTML avec Cheerio

        const deals = [];
        $('.productContainer').each((i, el) => {
            const title = $(el).find('.productTitle').text().trim();
            const currentPrice = $(el).find('.productPrice').text().trim();
            const oldPrice = $(el).find('.productOldPrice').text().trim();
            const discount = $(el).find('.productDiscount').text().trim();
            const url = $(el).find('a').attr('href');

            const discountPercentage = calculateDiscount(currentPrice, oldPrice);
            if (discountPercentage >= 50) {
                deals.push({ title, currentPrice, oldPrice, discount, url });
            }
        });

        if (deals.length > 0) {
            sendLogMessage(`📦 ${deals.length} deals trouvés sur Cdiscount.`);
        } else {
            sendLogMessage('❌ Aucun deal trouvé sur Cdiscount.');
        }

        deals.forEach(deal => {
            const embed = new EmbedBuilder()
                .setTitle(deal.title)
                .setURL(deal.url)
                .addFields(
                    { name: 'Prix actuel', value: deal.currentPrice, inline: true },
                    { name: 'Prix avant', value: deal.oldPrice, inline: true },
                    { name: 'Réduction', value: deal.discount, inline: true }
                )
                .setFooter({ text: 'Cdiscount Deal' });

            client.channels.cache.get(channels.cdiscount).send({ embeds: [embed] });
            sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount}%)`);
        });
    } catch (error) {
        sendLogMessage('⚠️ Erreur lors de la recherche des deals Cdiscount.');
        console.error('Erreur lors de la recherche des deals Cdiscount:', error);
    }
}

// ===================== RECHERCHE AUCHAN =====================

async function checkAuchanDeals() {
    try {
        sendLogMessage('🔎 Recherche de deals Auchan...');
        const { data } = await axios.get('https://www.auchan.fr/');
        const $ = cheerio.load(data); // Charger la page HTML avec Cheerio

        const deals = [];
        $('.dealProduct').each((i, el) => {
            const title = $(el).find('.productName').text().trim();
            const currentPrice = $(el).find('.price').text().trim();
            const oldPrice = $(el).find('.oldPrice').text().trim();
            const discount = $(el).find('.discount').text().trim();
            const url = $(el).find('a').attr('href');

            const discountPercentage = calculateDiscount(currentPrice, oldPrice);
            if (discountPercentage >= 50) {
                deals.push({ title, currentPrice, oldPrice, discount, url });
            }
        });

        if (deals.length > 0) {
            sendLogMessage(`📦 ${deals.length} deals trouvés sur Auchan.`);
        } else {
            sendLogMessage('❌ Aucun deal trouvé sur Auchan.');
        }

        deals.forEach(deal => {
            const embed = new EmbedBuilder()
                .setTitle(deal.title)
                .setURL(deal.url)
                .addFields(
                    { name: 'Prix actuel', value: deal.currentPrice, inline: true },
                    { name: 'Prix avant', value: deal.oldPrice, inline: true },
                    { name: 'Réduction', value: deal.discount, inline: true }
                )
                .setFooter({ text: 'Auchan Deal' });

            client.channels.cache.get(channels.auchan).send({ embeds: [embed] });
            sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount}%)`);
        });
    } catch (error) {
        sendLogMessage('⚠️ Erreur lors de la recherche des deals Auchan.');
        console.error('Erreur lors de la recherche des deals Auchan:', error);
    }
}

// ===================== RECHERCHE MANOMANO =====================

async function checkManomanoDeals() {
    try {
        sendLogMessage('🔎 Recherche de deals Manomano...');
        const { data } = await axios.get('https://www.manomano.fr/');
        const $ = cheerio.load(data); // Charger la page HTML avec Cheerio

        const deals = [];
        $('.productCard').each((i, el) => {
            const title = $(el).find('.productTitle').text().trim();
            const currentPrice = $(el).find('.productPrice').text().trim();
            const oldPrice = $(el).find('.productOldPrice').text().trim();
            const discount = $(el).find('.productDiscount').text().trim();
            const url = $(el).find('a').attr('href');

            const discountPercentage = calculateDiscount(currentPrice, oldPrice);
            if (discountPercentage >= 50) {
                deals.push({ title, currentPrice, oldPrice, discount, url });
            }
        });

        if (deals.length > 0) {
            sendLogMessage(`📦 ${deals.length} deals trouvés sur Manomano.`);
        } else {
            sendLogMessage('❌ Aucun deal trouvé sur Manomano.');
        }

        deals.forEach(deal => {
            const embed = new EmbedBuilder()
                .setTitle(deal.title)
                .setURL(deal.url)
                .addFields(
                    { name: 'Prix actuel', value: deal.currentPrice, inline: true },
                    { name: 'Prix avant', value: deal.oldPrice, inline: true },
                    { name: 'Réduction', value: deal.discount, inline: true }
                )
                .setFooter({ text: 'Manomano Deal' });

            client.channels.cache.get(channels.manomano).send({ embeds: [embed] });
            sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount}%)`);
        });
    } catch (error) {
        sendLogMessage('⚠️ Erreur lors de la recherche des deals Manomano.');
        console.error('Erreur lors de la recherche des deals Manomano:', error);
    }
}

// ===================== FONCTIONS UTILES =====================

// Fonction pour calculer le pourcentage de réduction
function calculateDiscount(currentPrice, oldPrice) {
    const current = parseFloat(currentPrice.replace('€', '').replace(',', '.'));
    const old = parseFloat(oldPrice.replace('€', '').replace(',', '.'));
    if (!isNaN(current) && !isNaN(old) && old > 0) {
        return ((old - current) / old) * 100;
    }
    return 0;
}

// Fonction pour déterminer la catégorie d'un produit (pour Amazon avancé)
function determineCategory(title) {
    title = title.toLowerCase();
    if (title.includes('électroménager')) return 'electromenager';
    if (title.includes('livre')) return 'livre';
    if (title.includes('enfant')) return 'enfant';
    if (title.includes('jouet')) return 'jouet';
    if (title.includes('entretien')) return 'entretien';
    if (title.includes('téléphone') || title.includes('tv') || title.includes('pc') || title.includes('gaming')) return 'electronique';
    return null; // Si aucune catégorie ne correspond
}

// Fonction pour vérifier si plusieurs coupons sont disponibles (pour Amazon)
function multipleCouponsAvailable(element) {
    // Logique à ajouter selon la structure HTML
    return $(element).find('.coupon').length > 1;
}

// Fonction pour vérifier s'il s'agit d'une vente flash (pour Amazon)
function isFlashSale(element) {
    // Logique à ajouter selon la structure HTML
    return $(element).find('.flashSale').length > 0;
}

// ===================== PLANIFICATION DES RECHERCHES =====================

// Planification des recherches pour chaque site
setInterval(() => {
    sendLogMessage('🔄 Lancement de la recherche de deals Amazon général...');
    checkAmazonGeneralDeals();
}, 3600000); // Toutes les heures

setInterval(() => {
    sendLogMessage('🔄 Lancement de la recherche de deals avancés Amazon...');
    checkAmazonAdvancedDeals();
}, 3600000); // Toutes les heures

setInterval(() => {
    sendLogMessage('🔄 Lancement de la recherche de deals Cdiscount...');
    checkCdiscountDeals();
}, 3600000); // Toutes les heures

setInterval(() => {
    sendLogMessage('🔄 Lancement de la recherche de deals Auchan...');
    checkAuchanDeals();
}, 3600000); // Toutes les heures

setInterval(() => {
    sendLogMessage('🔄 Lancement de la recherche de deals Manomano...');
    checkManomanoDeals();
}, 3600000); // Toutes les heures
