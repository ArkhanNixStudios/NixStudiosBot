const { loadDatabase, saveDatabase } = require('./database.js');

// Get user data from the database
function getUserData(userId) {
    const users = loadDatabase();
    return users[userId];
}

// Save user data to the database
function saveUsers() {
    const users = loadDatabase();
    saveDatabase(users);
}

// Check balance of a user
function checkBalance(userId) {
    const user = getUserData(userId);
    return user ? user.balance : null;
}

// Transfer balance from one user to another
function transferBalance(senderId, receiverId, amount) {
    const users = loadDatabase();
    const sender = users[senderId];
    const receiver = users[receiverId];

    if (!sender || !receiver || sender.balance < amount) return false;

    sender.balance -= amount;
    receiver.balance += amount;

    saveDatabase(users);
    return true;
}

module.exports = { checkBalance, transferBalance, getUserData, saveUsers };