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
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: '/app/.cache/puppeteer/chrome/linux-129.0.6668.58/chrome-linux'
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
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: '/app/.cache/puppeteer/chrome/linux-129.0.6668.58/chrome-linux'
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

            const channelId = channels.electromenager;
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

          if (parseFloat(discount.replace('%', '').replace('-', '').trim()) >= 50) {
              deals.push({ title, currentPrice, oldPrice, discount, url });
          }
      });

      if (deals.length > 0) {
          await sendLogMessage(`📦 ${deals.length} deals trouvés sur Cdiscount.`);
      } else {
          await sendLogMessage('❌ Aucun deal trouvé sur Cdiscount.');
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
              .setFooter({ text: 'Cdiscount Deal' });

          client.channels.cache.get(channels.cdiscount).send({ embeds: [embed] });
          await sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount})`);
      }
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

      // Extract deals similar to previous functions
      $('.productContainer').each((i, el) => {
          const title = $(el).find('.productTitle').text().trim();
          const currentPrice = $(el).find('.productPrice').text().trim();
          const oldPrice = $(el).find('.productOldPrice').text().trim();
          const discount = $(el).find('.productDiscount').text().trim();
          let url = $(el).find('a').attr('href');

          if (url.startsWith('/')) {
              url = `https://www.auchan.fr${url}`;
          }

          if (parseFloat(discount.replace('%', '').replace('-', '').trim()) >= 50) {
              deals.push({ title, currentPrice, oldPrice, discount, url });
          }
      });

      if (deals.length > 0) {
          await sendLogMessage(`📦 ${deals.length} deals trouvés sur Auchan.`);
      } else {
          await sendLogMessage('❌ Aucun deal trouvé sur Auchan.');
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
              .setFooter({ text: 'Auchan Deal' });

          client.channels.cache.get(channels.auchan).send({ embeds: [embed] });
          await sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount})`);
      }
  } catch (error) {
      await sendLogMessage('⚠️ Erreur lors de la recherche des deals Auchan.');
      console.error('Erreur lors de la recherche des deals Auchan:', error);
  }
}

// ===================== RECHERCHE MANOMANO =====================

async function checkManomanoDeals() {
  try {
      await sendLogMessage('🔎 Recherche de deals Manomano...');

      const { data } = await axios.get('https://www.manomano.fr/', {
          headers: {
              'User-Agent': rotateUserAgent(),
              'Referer': 'https://www.google.com',
              'Accept-Language': 'fr-FR,fr;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br'
          }
      });

      const $ = cheerio.load(data);
      const deals = [];

      // Extract deals similar to previous functions
      $('.productContainer').each((i, el) => {
          const title = $(el).find('.productTitle').text().trim();
          const currentPrice = $(el).find('.productPrice').text().trim();
          const oldPrice = $(el).find('.productOldPrice').text().trim();
          const discount = $(el).find('.productDiscount').text().trim();
          let url = $(el).find('a').attr('href');

          if (url.startsWith('/')) {
              url = `https://www.manomano.fr${url}`;
          }

          if (parseFloat(discount.replace('%', '').replace('-', '').trim()) >= 50) {
              deals.push({ title, currentPrice, oldPrice, discount, url });
          }
      });

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
          await sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount})`);
      }
  } catch (error) {
      await sendLogMessage('⚠️ Erreur lors de la recherche des deals Manomano.');
      console.error('Erreur lors de la recherche des deals Manomano:', error);
  }
    
}
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
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: '/app/.cache/puppeteer/chrome/linux-129.0.6668.58/chrome-linux'
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
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: '/app/.cache/puppeteer/chrome/linux-129.0.6668.58/chrome-linux'
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

            const channelId = channels.electromenager;
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

          if (parseFloat(discount.replace('%', '').replace('-', '').trim()) >= 50) {
              deals.push({ title, currentPrice, oldPrice, discount, url });
          }
      });

      if (deals.length > 0) {
          await sendLogMessage(`📦 ${deals.length} deals trouvés sur Cdiscount.`);
      } else {
          await sendLogMessage('❌ Aucun deal trouvé sur Cdiscount.');
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
              .setFooter({ text: 'Cdiscount Deal' });

          client.channels.cache.get(channels.cdiscount).send({ embeds: [embed] });
          await sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount})`);
      }
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

      // Extract deals similar to previous functions
      $('.productContainer').each((i, el) => {
          const title = $(el).find('.productTitle').text().trim();
          const currentPrice = $(el).find('.productPrice').text().trim();
          const oldPrice = $(el).find('.productOldPrice').text().trim();
          const discount = $(el).find('.productDiscount').text().trim();
          let url = $(el).find('a').attr('href');

          if (url.startsWith('/')) {
              url = `https://www.auchan.fr${url}`;
          }

          if (parseFloat(discount.replace('%', '').replace('-', '').trim()) >= 50) {
              deals.push({ title, currentPrice, oldPrice, discount, url });
          }
      });

      if (deals.length > 0) {
          await sendLogMessage(`📦 ${deals.length} deals trouvés sur Auchan.`);
      } else {
          await sendLogMessage('❌ Aucun deal trouvé sur Auchan.');
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
              .setFooter({ text: 'Auchan Deal' });

          client.channels.cache.get(channels.auchan).send({ embeds: [embed] });
          await sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount})`);
      }
  } catch (error) {
      await sendLogMessage('⚠️ Erreur lors de la recherche des deals Auchan.');
      console.error('Erreur lors de la recherche des deals Auchan:', error);
  }
}

// ===================== RECHERCHE MANOMANO =====================

async function checkManomanoDeals() {
  try {
      await sendLogMessage('🔎 Recherche de deals Manomano...');

      const { data } = await axios.get('https://www.manomano.fr/', {
          headers: {
              'User-Agent': rotateUserAgent(),
              'Referer': 'https://www.google.com',
              'Accept-Language': 'fr-FR,fr;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br'
          }
      });

      const $ = cheerio.load(data);
      const deals = [];

      // Extract deals similar to previous functions
      $('.productContainer').each((i, el) => {
          const title = $(el).find('.productTitle').text().trim();
          const currentPrice = $(el).find('.productPrice').text().trim();
          const oldPrice = $(el).find('.productOldPrice').text().trim();
          const discount = $(el).find('.productDiscount').text().trim();
          let url = $(el).find('a').attr('href');

          if (url.startsWith('/')) {
              url = `https://www.manomano.fr${url}`;
          }

          if (parseFloat(discount.replace('%', '').replace('-', '').trim()) >= 50) {
              deals.push({ title, currentPrice, oldPrice, discount, url });
          }
      });

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
          await sendLogMessage(`📌 Produit ajouté : ${deal.title} - ${deal.currentPrice}€ (réduction de ${deal.discount})`);
      }
  } catch (error) {
      await sendLogMessage('⚠️ Erreur lors de la recherche des deals Manomano.');
      console.error('Erreur lors de la recherche des deals Manomano:', error);
  }

}
function rotateUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}
