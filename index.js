const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome'); // Ajout de chrome pour les options
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.login(process.env.TOKEN);

const roles = {
    owner: 'OwnerRoleID',
    modo: 'ModoRoleID',
    preniumPlus: 'PreniumPlusRoleID',
    prenium: 'PreniumRoleID',
    visiteur: 'VisiteurRoleID',
};

const channels = {
    amazon: '1255863140974071893',
    cdiscount: '1285939619598172232',
    auchan: '1285969661535453215',
    manomano: '1285953900066902057',
    electromenager: 'ElectromenagerChannelID',
    livre: 'LivreChannelID',
    enfant: 'EnfantChannelID',
    jouet: 'JouetChannelID',
    entretien: 'EntretienChannelID',
    electronique: 'ElectroniqueChannelID',
    logs: '1285977835365994506',
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
    checkAmazonGeneralDeals();
    checkAmazonAdvancedDeals();
    checkCdiscountDeals();
    checkAuchanDeals();
    checkManomanoDeals();
});

// ===================== RECHERCHE AMAZON =====================

async function checkAmazonGeneralDeals() {
    try {
        sendLogMessage('🔎 Recherche de deals Amazon général...');
        
        const driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options().headless().addArguments('--no-sandbox', '--disable-dev-shm-usage'))
            .build();
        
        await driver.get('https://www.amazon.fr/deals');
        
        let deals = [];
        const dealElements = await driver.findElements(By.css('.dealContainer'));
        
        for (let el of dealElements) {
            const title = await el.findElement(By.css('.dealTitle')).getText();
            const currentPrice = await el.findElement(By.css('.dealPrice')).getText();
            const oldPrice = await el.findElement(By.css('.dealOldPrice')).getText();
            
            // Extraction du pourcentage de réduction depuis la structure de la page Amazon
            let discountElement = await el.findElement(By.css('div[data-component="dui-badge"] .style_badgeLabel__dD0Hv'));
            const discount = await discountElement.getText(); // Exemple : "-16%"
            
            const url = await el.findElement(By.css('a')).getAttribute('href');
            
            // Vérification si la réduction dépasse un certain seuil
            const discountValue = parseFloat(discount.replace('%', '').replace('-', '').trim());
            if (discountValue >= 70) {
                deals.push({ title, currentPrice, oldPrice, discount, url });
            }
        }
        
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
            sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount})`);
        });
        
        await driver.quit();
    } catch (error) {
        sendLogMessage('⚠️ Erreur lors de la recherche des deals Amazon général.');
        console.error('Erreur lors de la recherche des deals Amazon général:', error);
    }
}

// ===================== RECHERCHE AVANCÉE AMAZON =====================

async function checkAmazonAdvancedDeals() {
    try {
        sendLogMessage('🔎 Recherche de deals avancés Amazon...');
        
        const driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options().headless().addArguments('--no-sandbox', '--disable-dev-shm-usage'))
            .build();
        
        await driver.get('https://www.amazon.fr/deals');
        
        let deals = [];
        const dealElements = await driver.findElements(By.css('.dealContainer'));
        
        for (let el of dealElements) {
            const title = await el.findElement(By.css('.dealTitle')).getText();
            const currentPrice = await el.findElement(By.css('.dealPrice')).getText();
            const oldPrice = await el.findElement(By.css('.dealOldPrice')).getText();
            const url = await el.findElement(By.css('a')).getAttribute('href');
            
            const discountPercentage = calculateDiscount(currentPrice, oldPrice);
            if (discountPercentage >= 60) {
                const category = determineCategory(title);
                deals.push({ title, currentPrice, oldPrice, discount: `${discountPercentage}%`, url, category });
            }
        }
        
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
        
        await driver.quit();
    } catch (error) {
        sendLogMessage('⚠️ Erreur lors de la recherche des deals avancés Amazon.');
        console.error('Erreur lors de la recherche des deals avancés Amazon:', error);
    }
}

// ===================== RECHERCHE CDISCOUNT =====================

async function checkCdiscountDeals() {
    try {
        sendLogMessage('🔎 Recherche de deals Cdiscount...');

        // Envoi de la requête avec des headers supplémentaires pour éviter les erreurs 403
        const { data } = await axios.get('https://www.cdiscount.com/', {
            headers: {
                'User-Agent': rotateUserAgent(),
                'Referer': 'https://www.google.com',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br'
            }
        });
        
        // Chargement du HTML dans cheerio
        const $ = cheerio.load(data);
        const deals = [];

        // Sélection des conteneurs de produit et extraction des informations
        $('.productContainer').each((i, el) => {
            const title = $(el).find('.productTitle').text().trim();
            const currentPrice = $(el).find('.productPrice').text().trim();
            const oldPrice = $(el).find('.productOldPrice').text().trim();
            const discount = $(el).find('.productDiscount').text().trim();
            let url = $(el).find('a').attr('href');

            // Si l'URL est relative, la rendre absolue
            if (url.startsWith('/')) {
                url = `https://www.cdiscount.com${url}`;
            }

            // Calcul de la réduction avec la gestion des prix
            const discountPercentage = calculateDiscount(currentPrice, oldPrice);
            if (discountPercentage >= 50) {
                deals.push({ title, currentPrice, oldPrice, discount, url });
            }
        });

        // Vérification des résultats
        if (deals.length > 0) {
            sendLogMessage(`📦 ${deals.length} deals trouvés sur Cdiscount.`);
        } else {
            sendLogMessage('❌ Aucun deal trouvé sur Cdiscount.');
        }

        // Envoi des résultats dans le salon Discord
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
        const { data } = await axios.get('https://www.auchan.fr/', {
            headers: {
                'User-Agent': rotateUserAgent()
            }
        });
        
        const $ = cheerio.load(data);
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
        const { data } = await axios.get('https://www.manomano.fr/', {
            headers: {
                'User-Agent': rotateUserAgent(),
                'Accept-Language': 'fr-FR,fr;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            },
        });
        
        const $ = cheerio.load(data);
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
        });
    } catch (error) {
        sendLogMessage('⚠️ Erreur lors de la recherche des deals Manomano.');
        console.error('Erreur lors de la recherche des deals Manomano:', error);
    }
}

// ===================== UTILITAIRES =====================

function calculateDiscount(currentPrice, oldPrice) {
    const current = parseFloat(currentPrice.replace('€', '').replace(',', '.'));
    const old = parseFloat(oldPrice.replace('€', '').replace(',', '.'));
    return ((old - current) / old * 100).toFixed(2);
}

function rotateUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
        'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Mobile Safari/537.36',
        // Ajoute plus d'agents utilisateurs si nécessaire
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}
