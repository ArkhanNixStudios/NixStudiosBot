const { loadDatabase, saveDatabase } = require('./database.js');
const bot = require('../index.js');

// Add XP to the user
function addXP(userId) {
    const users = loadDatabase();
    if (!users[userId]) {
        users[userId] = { xp: 0, level: 1, rank: "Newbie" };
    }

    const xpGained = Math.floor(Math.random() * 10) + 1;
    users[userId].xp += xpGained;
    let levelUpMessage = "";
    let rankUpMessage = "";

    // Cek Level Up
    const nextLevelXp = users[userId].level * 100;
    if (users[userId].xp >= nextLevelXp) {
        users[userId].level++;
        levelUpMessage = `🎉 *Level Up!* Kamu sekarang Level *${users[userId].level}*!`;
    }

    // Cek Rank Up
    let oldRank = users[userId].rank;
    users[userId].rank = getRank(users[userId].xp);

    if (users[userId].rank !== oldRank) {
        rankUpMessage = `🏆 *Selamat!* Rank kamu naik menjadi ${users[userId].rank}!`;
    }

    // Kirim notif kalau ada perubahan
    if (levelUpMessage || rankUpMessage) {
        bot.sendMessage(userId, `${levelUpMessage}\n${rankUpMessage}`);
    }

    saveDatabase(users);
    return xpGained;
}

// Fungsi buat dapetin rank berdasarkan XP
function getRank(xp) {
    if (xp >= 999999) return "Dewa Elit";
    if (xp >= 250000) return "Dewa";
    if (xp >= 50000) return "Admin";
    if (xp >= 10000) return "Mythic";
    if (xp >= 6000) return "Legend";
    if (xp >= 3000) return "Master";
    if (xp >= 1500) return "Elite";
    if (xp >= 500) return "Pejuang";
    return "Newbie";
}

// Give random item to the user
function giveRandomItem(userId) {
    const users = loadDatabase();
    const user = users[userId];
    if (!user) return null;

    // Initialize inventory if it doesn't exist
    user.inventory = user.inventory || {};  // Ensure inventory exists

    const items = [
        "Kayu", "Stik", "Batu", "Besi", "Emas", "Berlian", "Obsidian", "Kristal Ajaib",
        "Ruby", "Netherite", "Sapphire", "Emerald", "Cangkul", "Kapak", "Obor", "Kapal", "Pancing",
        "Sekop", "Ember", "Pedang Kayu", "Pedang Besi", "Pedang Berlian", "Pedang Netherite",
        "Pedang Api", "Pedang Es", "Pedang Petir", "Pedang Darah", "Pembunuh Naga", "Armor Besi",
        "Armor Berlian", "Armor Api", "Armor Es", "Armor Naga", "Busur Kayu", "Busur Besi",
        "Busur Berlian", "Anak Panah Api", "Anak Panah Es", "Anak Panah Petir", "Apel", "Roti",
        "Apel Emas", "Daging Panggang", "Ikan", "Daging Naga", "Ramuan Penyembuh", "Ramuan Mana",
        "Ramuan Stamina", "Ramuan Racun", "Ramuan Gaib", "Mata Naga", "Gulungan Sihir", "Bulu Phoenix",
        "Kitab Kuno", "Kristal Waktu", "Hati Iblis", "Peta Harta Karun", "Permata Terkutuk",
        "Koin Bajak Laut", "Segel Raja", "Batu Bulan", "Kontol", "Bedrock"
    ];

    const item = items[Math.floor(Math.random() * items.length)];

    // Initialize item in inventory if not already present
    user.inventory[item] = user.inventory[item] || { name: item, quantity: 0 };
    user.inventory[item].quantity++;

    saveDatabase(users);
    return item;
}

// Apply damage to tools (when performing actions like sailing, hunting, etc.)
function applyDamageToTools(userId) {
    const users = loadDatabase();
    const user = users[userId];
    if (!user || !user.inventory) return;

    // Apply damage to tools like wood, stone, etc.
    for (let item in user.inventory) {
        if (user.inventory[item].quantity > 0) {
            user.inventory[item].quantity--;
            if (user.inventory[item].quantity === 0) delete user.inventory[item];
        }
    }

    saveDatabase(users);
}

// Function to register the user with initial values
function registerUser(userId) {
    const users = loadDatabase();

    if (!users[userId]) {
        users[userId] = {
            balance: 100, // Starting balance
            inventory: {
                kayu: { name: 'Kayu', quantity: 10 },
                stick: { name: 'Stick', quantity: 10 },
                stone: { name: 'Stone', quantity: 5 },
                iron: { name: 'Iron', quantity: 1 }
            },
            xp: 0,
            level: 1,
            rank: "Bronze",
            lastClaim: { daily: 0, weekly: 0, monthly: 0 }
        };
    }

    // Pastikan balance tetap rapi (tanpa angka pecahan aneh)
    users[userId].balance = parseFloat(users[userId].balance.toFixed(2));

    saveDatabase(users);
}

module.exports = { addXP, giveRandomItem, applyDamageToTools, registerUser};