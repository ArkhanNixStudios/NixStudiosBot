const fs = require('fs');
const databasePath = './database.json';
const statsPath = './bot_stats.json';

// Load database utama
function loadDatabase() {
    try {
        const data = fs.readFileSync(databasePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading database:', error);
        return {};
    }
}

// Save database utama
function saveDatabase(data) {
    try {
        fs.writeFileSync(databasePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving database:', error);
    }
}

// Load bot stats
function loadBotStats() {
    try {
        const data = fs.readFileSync(statsPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading bot stats:', error);
        return {
            totalCommands: 0,
            totalUsers: 0,
            totalGamblingWins: 0,
            totalGamblingLoses: 0
        };
    }
}

// Save bot stats
function saveBotStats(data) {
    try {
        fs.writeFileSync(statsPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving bot stats:', error);
    }
}

// Update bot stats (dipake buat tracking statistik bot)
function updateBotStats(type) {
    const stats = loadBotStats();

    if (type === "command") stats.totalCommands += 1;
    if (type === "gamblingWin") stats.totalGamblingWins += 1;
    if (type === "gamblingLose") stats.totalGamblingLoses += 1;

    saveBotStats(stats);
}

// Get bot stats buat /stats command
function getBotStats() {
    return loadBotStats();
}
// Fungsi untuk mendapatkan data user berdasarkan userId
function getUserData(userId) {
    const users = loadDatabase();
    return users[userId];  // Mengembalikan data user berdasarkan userId
}

module.exports = { 
    loadDatabase, 
    saveDatabase,
    loadBotStats,
    saveBotStats,
    updateBotStats,
    getBotStats,
    getUserData
};