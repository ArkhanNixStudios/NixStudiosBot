const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
    async tiktokDownloader(url) {
        try {
            const { data } = await axios.get("https://ssstik.io/en");
            const $ = cheerio.load(data);
            const token = $("input[name='token']").val();

            const response = await axios.post("https://ssstik.io/abc", new URLSearchParams({
                id: url,
                locale: "en",
                token
            }));

            return { video: response.data.url };
        } catch (error) {
            throw new Error("Gagal mengunduh video TikTok!");
        }
    },

    async facebookDownloader(url) {
        try {
            const response = await axios.get(`https://www.getfvid.com/downloader?url=${encodeURIComponent(url)}`);
            const $ = cheerio.load(response.data);
            const videoUrl = $("a.download-link").attr("href");

            return { video: videoUrl };
        } catch (error) {
            throw new Error("Gagal mengunduh video Facebook!");
        }
    },

    async instagramDownloader(url) {
        try {
            const response = await axios.get(`https://saveinsta.app/api?url=${encodeURIComponent(url)}`);
            return { media: response.data.url, type: response.data.type };
        } catch (error) {
            throw new Error("Gagal mengunduh konten Instagram!");
        }
    },

    async youtubeDownloader(url) {
        try {
            const response = await axios.get(`https://y2mate.com/api/json?url=${encodeURIComponent(url)}`);
            return { video: response.data.url };
        } catch (error) {
            throw new Error("Gagal mengunduh video YouTube!");
        }
    },

    async tiktokStalk(username) {
        try {
            const { data } = await axios.get(`https://www.tiktok.com/@${username}`);
            const $ = cheerio.load(data);
            return {
                username,
                fullname: $("h1").text(),
                followers: $("strong[data-e2e='followers-count']").text(),
                likes: $("strong[data-e2e='likes-count']").text(),
                avatar: $("img").attr("src"),
                profileUrl: `https://www.tiktok.com/@${username}`
            };
        } catch (error) {
            throw new Error("Gagal menemukan akun TikTok!");
        }
    },

    async instagramStalk(username) {
        try {
            const { data } = await axios.get(`https://www.instagram.com/${username}/?__a=1`);
            return {
                username,
                fullname: data.graphql.user.full_name,
                followers: data.graphql.user.edge_followed_by.count,
                following: data.graphql.user.edge_follow.count,
                posts: data.graphql.user.edge_owner_to_timeline_media.count,
                avatar: data.graphql.user.profile_pic_url_hd,
                profileUrl: `https://www.instagram.com/${username}`
            };
        } catch (error) {
            throw new Error("Gagal menemukan akun Instagram!");
        }
    },

    async facebookStalk(username) {
        try {
            const { data } = await axios.get(`https://m.facebook.com/${username}`);
            const $ = cheerio.load(data);
            return {
                fullname: $("title").text(),
                birthday: $("span:contains('Born')").text(),
                location: $("span:contains('Lives in')").text(),
                avatar: $("img").attr("src"),
                profileUrl: `https://www.facebook.com/${username}`
            };
        } catch (error) {
            throw new Error("Gagal menemukan akun Facebook!");
        }
    },

    async youtubeStalk(channelId) {
        try {
            const { data } = await axios.get(`https://www.youtube.com/channel/${channelId}/about`);
            const $ = cheerio.load(data);
            return {
                channelName: $("meta[property='og:title']").attr("content"),
                subscribers: $("yt-formatted-string#subscriber-count").text(),
                videos: $("yt-formatted-string:contains(' videos')").text(),
                joinDate: $("span:contains('Joined')").text(),
                avatar: $("meta[property='og:image']").attr("content"),
                profileUrl: `https://www.youtube.com/channel/${channelId}`
            };
        } catch (error) {
            throw new Error("Gagal menemukan channel YouTube!");
        }
    }
};