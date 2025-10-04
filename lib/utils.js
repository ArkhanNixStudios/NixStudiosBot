// lib/utils.js
const generateCaptcha = () => {
    const text = Math.random().toString(36).substring(2, 8);
    return {
        answer: text,
        image: `https://dummyimage.com/100x50/000/fff&text=${text}`
    };
};

// Penanganan error saat download
const downloadError = (url) => `⚠️ Error downloading from ${url}`;

module.exports = { generateCaptcha, downloadError };