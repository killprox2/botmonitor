const axios = require('axios');
const cheerio = require('cheerio');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const winston = require('winston');

const apiKey = process.env.SCRAPER_API_KEY;  // Ta clé API ScraperAPI
const baseUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=`;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Configurer les logs avec Winston
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] - ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'bot_logs.log' })
    ]
});

// Fonction pour scraper les pages Amazon via ScraperAPI
async function scrapeAmazonPage(url) {
    try {
        const fullUrl = `${baseUrl}${encodeURIComponent(url)}`;
        const response = await axios.get(fullUrl);
        if (response.status !== 200) {
            throw new Error(`Erreur HTTP : ${response.status}`);
        }
        return response.data;
    } catch (error) {
        logger.error(`Erreur lors de la requête ScraperAPI : ${error.message}`);
        throw error;
    }
}

// Fonction pour extraire les informations de produit depuis la page
async function scrapeAmazon(category, channelID) {
    logger.info(`Scraping démarré pour la catégorie ${category}.`);
    for (let i = 1; i <= 10; i++) {
        const url = `https://www.amazon.fr/s?k=${category}&page=${i}`;
        try {
            const html = await scrapeAmazonPage(url);
            const $ = cheerio.load(html);

            let products = [];

            $('.s-main-slot .s-result-item').each((index, element) => {
                const title = $(element).find('h2 a span').text();
                const link = $(element).find('h2 a').attr('href');
                const priceOld = $(element).find('.a-price.a-text-price span').text();
                const priceNew = $(element).find('.a-price .a-offscreen').text();

                if (title && link && priceOld && priceNew) {
                    const oldPrice = parseFloat(priceOld.replace(/[^\d,.-]/g, '').replace(',', '.'));
                    const newPrice = parseFloat(priceNew.replace(/[^\d,.-]/g, '').replace(',', '.'));
                    const discount = ((oldPrice - newPrice) / oldPrice) * 100;

                    if (discount >= 50) {
                        products.push({
                            title: title,
                            link: `https://www.amazon.fr${link}`,
                            oldPrice: oldPrice,
                            newPrice: newPrice,
                            discount: discount.toFixed(2)
                        });
                    }
                }
            });

            if (products.length > 0) {
                const embed = new EmbedBuilder()
                    .setTitle(`Produits avec réduction dans la catégorie ${category}`)
                    .setColor('#ff9900')
                    .setDescription(products.map(p => `**${p.title}**\nAncien prix: ${p.oldPrice}€, Nouveau prix: ${p.newPrice}€, Réduction: ${p.discount}%\n[Lien](${p.link})`).join('\n\n'));

                const discordChannel = client.channels.cache.get(channelID);
                if (discordChannel) {
                    discordChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            logger.error(`Erreur lors de l'accès à la page ${i} pour la catégorie ${category}: ${error.message}`);
        }
    }
}

// Démarrage du scraping
async function startScraping() {
    const categories = { "entretien": "ID_SALON_ENTRETIEN" }; // Mets à jour les catégories
    for (const [category, channelID] of Object.entries(categories)) {
        await scrapeAmazon(category, channelID);
    }
}

client.once('ready', () => {
    logger.info('Bot is ready!');
    startScraping();  // Lancer le scraping dès que le bot est prêt
});

client.login(process.env.TOKEN);
