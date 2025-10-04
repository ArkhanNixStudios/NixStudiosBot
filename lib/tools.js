// lib/tools.js
const axios = require('axios');
const ping = require('./ping');
const fs = require('fs');

// Download file dengan Axios
async function downloadFile(url, path) {
    const response = await axios({ url, responseType: 'stream' });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(path);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// Cek ping server
async function checkPing(host) {
    const res = await ping.promise.probe(host);
    return res;
}

// Scrape website
async function scrapeWebsite(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

module.exports = { downloadFile, checkPing, scrapeWebsite };