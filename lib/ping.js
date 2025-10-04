// lib/ping.js
const { exec } = require('child_process');

const pingServer = (host) => {
    return new Promise((resolve) => {
        exec(`ping -c 4 ${host}`, (err, stdout) => {
            resolve(stdout || "Ping failed!");
        });
    });
};

module.exports = { pingServer };