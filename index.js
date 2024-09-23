const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
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
async function sendLogMessage(content) {
    const logChannel = await client.channels.fetch(channels.logs);
    if (logChannel) {
        await logChannel.send(content);
    } else {
        console.log('Salon de logs introuvable.');
    }
}

// Logs au démarrage du bot
client.once('ready', async () => {
    console.log('Bot est en ligne !');
    await sendLogMessage('✅ Bot démarré et prêt à l\'emploi.');
    await checkAmazonGeneralDeals();
    await checkAmazonAdvancedDeals();
    await checkCdiscountDeals();
    await checkAuchanDeals();
    await checkManomanoDeals();
});

// ===================== RECHERCHE AMAZON =====================

async function checkAmazonGeneralDeals() {
    try {
        await sendLogMessage('🔎 Recherche de deals Amazon général...');

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        await page.goto('https://www.amazon.fr/deals', { waitUntil: 'networkidle2' });

        let deals = await page.evaluate(() => {
            let dealElements = document.querySelectorAll('.dealContainer');
            let extractedDeals = [];
            dealElements.forEach(el => {
                let title = el.querySelector('.dealTitle').innerText;
                let currentPrice = el.querySelector('.dealPrice').innerText;
                let oldPrice = el.querySelector('.dealOldPrice').innerText;
                let discount = el.querySelector('div[data-component="dui-badge"] .style_badgeLabel__dD0Hv').innerText;
                let url = el.querySelector('a').href;

                if (parseFloat(discount.replace('%', '').replace('-', '').trim()) >= 70) {
                    extractedDeals.push({ title, currentPrice, oldPrice, discount, url });
                }
            });
            return extractedDeals;
        });

        if (deals.length > 0) {
            await sendLogMessage(`📦 ${deals.length} deals trouvés sur Amazon général.`);
        } else {
            await sendLogMessage('❌ Aucun deal trouvé sur Amazon général.');
        }

        for (let deal of deals) {
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
            await sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount})`);
        }

        await browser.close();
    } catch (error) {
        await sendLogMessage('⚠️ Erreur lors de la recherche des deals Amazon général.');
        console.error('Erreur lors de la recherche des deals Amazon général:', error);
    }
}

// ===================== RECHERCHE AVANCÉE AMAZON =====================

async function checkAmazonAdvancedDeals() {
    try {
        await sendLogMessage('🔎 Recherche de deals avancés Amazon...');

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        await page.goto('https://www.amazon.fr/deals', { waitUntil: 'networkidle2' });

        let deals = await page.evaluate(() => {
            let dealElements = document.querySelectorAll('.dealContainer');
            let extractedDeals = [];
            dealElements.forEach(el => {
                let title = el.querySelector('.dealTitle').innerText;
                let currentPrice = el.querySelector('.dealPrice').innerText;
                let oldPrice = el.querySelector('.dealOldPrice').innerText;
                let discount = el.querySelector('div[data-component="dui-badge"] .style_badgeLabel__dD0Hv').innerText;
                let url = el.querySelector('a').href;

                if (parseFloat(discount.replace('%', '').replace('-', '').trim()) >= 60) {
                    extractedDeals.push({ title, currentPrice, oldPrice, discount, url });
                }
            });
            return extractedDeals;
        });

        if (deals.length > 0) {
            await sendLogMessage(`📦 ${deals.length} deals avancés trouvés sur Amazon.`);
        } else {
            await sendLogMessage('❌ Aucun deal avancé trouvé sur Amazon.');
        }

        for (let deal of deals) {
            const embed = new EmbedBuilder()
                .setTitle(deal.title)
                .setURL(deal.url)
                .addFields(
                    { name: 'Prix actuel', value: deal.currentPrice, inline: true },
                    { name: 'Prix avant', value: deal.oldPrice, inline: true },
                    { name: 'Réduction', value: deal.discount, inline: true }
                )
                .setFooter({ text: 'Amazon Advanced Deal' });

            const channelId = channels.electromenager; // Assurez-vous que la catégorie soit correcte
            client.channels.cache.get(channelId).send({ embeds: [embed] });
            await sendLogMessage(`📌 Produit ajouté dans électroménager : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount}%)`);
        }

        await browser.close();
    } catch (error) {
        await sendLogMessage('⚠️ Erreur lors de la recherche des deals avancés Amazon.');
        console.error('Erreur lors de la recherche des deals avancés Amazon:', error);
    }
}

// ===================== RECHERCHE CDISCOUNT =====================

async function checkCdiscountDeals() {
    try {
        await sendLogMessage('🔎 Recherche de deals Cdiscount...');

        const { data } = await axios.get('https://www.cdiscount.com/', {
            headers: {
                'User-Agent': rotateUserAgent(),
                'Referer': 'https://www.google.com',
                'Accept-Language': 'fr-FR,fr;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br'
            }
        });

        const $ = cheerio.load(data);
        const deals = [];

        $('.productContainer').each((i, el) => {
            const title = $(el).find('.productTitle').text().trim();
            const currentPrice = $(el).find('.productPrice').text().trim();
            const oldPrice = $(el).find('.productOldPrice').text().trim();
            const discount = $(el).find('.productDiscount').text().trim();
            let url = $(el).find('a').attr('href');

            if (url.startsWith('/')) {
                url = `https://www.cdiscount.com${url}`;
            }

            const discountPercentage = calculateDiscount(currentPrice, oldPrice);
            if (discountPercentage >= 50) {
                deals.push({ title, currentPrice, oldPrice, discount, url });
            }
        });

        if (deals.length > 0) {
            await sendLogMessage(`📦 ${deals.length} deals trouvés sur Cdiscount.`);
        } else {
            await sendLogMessage('❌ Aucun deal trouvé sur Cdiscount.');
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
            });
          } catch (error) {
              await sendLogMessage('⚠️ Erreur lors de la recherche des deals Cdiscount.');
              console.error('Erreur lors de la recherche des deals Cdiscount:', error);
          }
  }
  // ===================== RECHERCHE AUCHAN =====================

async function checkAuchanDeals() {
  try {
      await sendLogMessage('🔎 Recherche de deals Auchan...');
      
      const { data } = await axios.get('https://www.auchan.fr/', {
          headers: {
              'User-Agent': rotateUserAgent(),
              'Referer': 'https://www.google.com',
              'Accept-Language': 'fr-FR,fr;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br'
          }
      });

      const $ = cheerio.load(data);
      const deals = [];

      $('.productContainer').each((i, el) => {
          const title = $(el).find('.productTitle').text().trim();
          const currentPrice = $(el).find('.productPrice').text().trim();
          const oldPrice = $(el).find('.productOldPrice').text().trim();
          const discount = $(el).find('.productDiscount').text().trim();
          let url = $(el).find('a').attr('href');

          if (url.startsWith('/')) {
              url = `https://www.auchan.fr${url}`;
          }

          const discountPercentage = calculateDiscount(currentPrice, oldPrice);
          if (discountPercentage >= 50) {
              deals.push({ title, currentPrice, oldPrice, discount, url });
          }
      });

      if (deals.length > 0) {
          await sendLogMessage(`📦 ${deals.length} deals trouvés sur Auchan.`);
      } else {
          await sendLogMessage('❌ Aucun deal trouvé sur Auchan.');
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
      await sendLogMessage('⚠️ Erreur lors de la recherche des deals Auchan.');
      console.error('Erreur lors de la recherche des deals Auchan:', error);
  }
}

// ===================== RECHERCHE MANOMANO =====================


async function checkManomanoDeals() {
    try {
        await sendLogMessage('🔎 Recherche de deals Manomano...');

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        await page.goto('https://www.manomano.fr', { waitUntil: 'networkidle2' });

        const deals = await page.evaluate(() => {
            const dealElements = document.querySelectorAll('.productContainer');
            const extractedDeals = [];
            dealElements.forEach(el => {
                const title = el.querySelector('.productTitle').innerText.trim();
                const currentPrice = el.querySelector('.productPrice').innerText.trim();
                const oldPrice = el.querySelector('.productOldPrice').innerText.trim();
                const discount = el.querySelector('.productDiscount').innerText.trim();
                const url = el.querySelector('a').href;
                extractedDeals.push({ title, currentPrice, oldPrice, discount, url });
            });
            return extractedDeals;
        });

        await browser.close();

        if (deals.length > 0) {
            await sendLogMessage(`📦 ${deals.length} deals trouvés sur Manomano.`);
        } else {
            await sendLogMessage('❌ Aucun deal trouvé sur Manomano.');
        }

        for (let deal of deals) {
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
        }
    } catch (error) {
        await sendLogMessage('⚠️ Erreur lors de la recherche des deals Manomano.');
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
      // Ajoutez d'autres agents utilisateurs si nécessaire
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

