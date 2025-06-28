// index.js
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs').promises; // Using promises version of fs
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');
const { exec } = require('child_process'); // To run ffmpeg commands

// Set the path for ffmpeg, required by fluent-ffmpeg for media processing
process.env.FFMPEG_PATH = ffmpeg.path;

// Initialize FFmpeg for media operations
// const Ffmpeg = require('fluent-ffmpeg'); // If you want to use fluent-ffmpeg directly

// Bot start
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

// QR Code generate
client.on('qr', qr => {
    console.log("📱 Scan this QR with your WhatsApp:");
    qrcode.generate(qr, { small: true });
});

// Bot Ready
client.on('ready', () => {
    console.log("🤖 Bot is online and ready to chat! 💬");
});

client.on('authenticated', () => {
    console.log('✅ Authenticated successfully!');
});

client.on('auth_failure', msg => {
    console.error('❌ AUTHENTICATION FAILURE', msg);
});

client.on('disconnected', (reason) => {
    console.log('🔴 Client was disconnected', reason);
    // You might want to re-initialize here, but be careful with infinite loops
    // client.initialize();
});

// Admin number (replace with your WhatsApp number in 'countrycodephonenumber@c.us' format)
const ADMIN_NUMBER = '923001234567@c.us'; // Make sure to replace this!

// Features toggle (default: all on)
const features = {
    autoViewStatus: true,
    autoReply: true,
    autoReact: true,
    autoSaveContacts: false, // Be careful with this, can be intrusive
    antiCall: true,
    chatGPT: true, // Requires an API key
    autoBio: false, // Requires external API / more complex logic
    alwaysOnline: false, // Not directly supported by whatsapp-web.js
    fakeTyping: false,   // Not directly supported by whatsapp-web.js
    fakeRecording: false // Not directly supported by whatsapp-web.js
};

// Emoji list for reactions
const emojis = ['🔥', '😂', '❤️', '😎', '💯', '😍', '👍', '😊', '🎉'];

// --- Helper Functions ---

// Function to download media (for generic URLs)
async function downloadMediaFromUrl(url, filePath) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });
        const writer = require('fs').createWriteStream(filePath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading media:', error);
        return null;
    }
}

// --- Message Handling ---
client.on('message', async message => {
    const chat = await message.getChat();
    const sender = message.from;
    const isGroup = chat.isGroup;
    const isAdmin = sender === ADMIN_NUMBER;
    const quotedMessage = message.hasQuotedMsg ? await message.getQuotedMessage() : null;

    // 👁️‍🗨️ Auto Seen (Can be turned off)
    if (features.autoViewStatus) {
        await chat.sendSeen();
    }

    // 🔥 Random Emoji React (Can be turned off)
    if (features.autoReact) {
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        await message.react(randomEmoji);
    }

    // 💬 Auto Friendly Reply (Can be turned off, only if not a command)
    if (features.autoReply && !message.fromMe && !message.body.startsWith('!')) {
        await message.reply(`Haha 😂 mazay aa gaye yeh parh ke! Tusi great ho 😎`);
    }

    // --- Command Handling ---
    if (message.body.startsWith('!')) {
        const args = message.body.slice(1).split(' ');
        const command = args.shift().toLowerCase();
        const text = args.join(' ');

        switch (command) {
            case 'help':
                let helpMessage = "🌟 *Download Menu:*\n";
                helpMessage += " • `!facebook <url>`\n";
                helpMessage += " • `!tiktok <url>`\n";
                helpMessage += " • `!instagram <url>`\n";
                helpMessage += " • `!twitter <url>`\n";
                helpMessage += " • `!youtube <url>` (for !play, !mp3, !mp4, !video)\n";
                helpMessage += " • `!yts <query>` (Youtube)\n";
                helpMessage += " • `!spotifydl <url>`\n";
                helpMessage += " • `!spotifysearch <query>`\n";
                helpMessage += " • `!pinterestdl <url>`\n";
                helpMessage += " • `!img <query>` (Image search)\n";
                helpMessage += " • `!ringtone <query>`\n";
                helpMessage += " • `!apk <query>`\n";
                helpMessage += " • `!ssweb <url>` (Website Screenshot)\n";
                helpMessage += " • `!dog` (Random dog image)\n";
                helpMessage += "\n🔥 *Bot Features:*\n";
                helpMessage += " • `!status`\n";
                helpMessage += " • `!joke`\n";
                helpMessage += " • `!sticker` (Reply to an image)\n";
                helpMessage += " • `!ping`\n";
                helpMessage += " • `!everyone` (Group Admin Only)\n";
                helpMessage += " • `!sendtoall <message>` (Admin Only)\n";
                helpMessage += " • `!features` (Toggle bot features - Admin Only)\n";
                helpMessage += " • `!gpt <query>` (ChatGPT - requires API key setup)\n";
                helpMessage += " • `!viewonce` (Reply to a view once message)\n";
                await message.reply(helpMessage);
                break;

            case 'status':
                await message.reply('🤖 Bot is running perfectly! 👍');
                break;

            case 'joke':
                const jokes = [
                    "Why don't scientists trust atoms? Because they make up everything!",
                    "Did you hear about the two guys who stole a calendar? They each got six months.",
                    "What do you call a fish with no eyes? Fsh!",
                    "Why was the math book sad? Because it had too many problems.",
                ];
                const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
                await message.reply(randomJoke);
                break;

            case 'sticker':
                if (quotedMessage && quotedMessage.hasMedia) {
                    try {
                        const media = await quotedMessage.downloadMedia();
                        await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
                        await message.reply('Image converted to sticker! ✨');
                    } catch (error) {
                        console.error('Error converting to sticker:', error);
                        await message.reply('Failed to convert to sticker. Please reply to a valid image.');
                    }
                } else if (message.hasMedia) {
                     try {
                        const media = await message.downloadMedia();
                        await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
                        await message.reply('Image converted to sticker! ✨');
                    } catch (error) {
                        console.error('Error converting to sticker:', error);
                        await message.reply('Failed to convert to sticker. Please send a valid image.');
                    }
                }
                else {
                    await message.reply('Please reply to an image or send an image with the command to convert it to a sticker.');
                }
                break;

            case 'ping':
                await message.reply('pong');
                break;

            case 'everyone':
                if (isGroup && isAdmin) { // Only for group admins
                    let text = "👥 *Attention everyone!*";
                    let mentions = [];
                    for (let participant of chat.participants) {
                        const contact = await client.getContactById(participant.id._serialized);
                        mentions.push(contact);
                        text += `@${participant.id.user} `;
                    }
                    await chat.sendMessage(text, { mentions });
                } else if (!isGroup) {
                    await message.reply('This command can only be used in a group chat.');
                } else {
                    await message.reply('You are not authorized to use this command.');
                }
                break;

            case 'sendtoall':
                if (isAdmin) {
                    if (!text) {
                        await message.reply('Please provide a message to send to all contacts. Example: `!sendtoall Hello everyone!`');
                        return;
                    }
                    try {
                        const contacts = await client.getContacts();
                        let sentCount = 0;
                        await message.reply('Sending message to all contacts, please wait...');
                        for (const contact of contacts) {
                            if (!contact.isGroup && contact.id.user && contact.id.user !== client.info.me.user) {
                                await client.sendMessage(contact.id._serialized, text);
                                sentCount++;
                                await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to avoid ban
                            }
                        }
                        await message.reply(`Message sent to ${sentCount} contacts successfully!`);
                    } catch (error) {
                        console.error('Error sending message to all contacts:', error);
                        await message.reply('Failed to send message to all contacts.');
                    }
                } else {
                    await message.reply('You are not authorized to use this command.');
                }
                break;

            case 'features':
                if (isAdmin) {
                    if (args.length === 2 && ['on', 'off'].includes(args[1].toLowerCase()) && features.hasOwnProperty(args[0])) {
                        const featureName = args[0];
                        const state = args[1].toLowerCase() === 'on';
                        features[featureName] = state;
                        await message.reply(`Feature *${featureName}* turned ${state ? 'on' : 'off'}.`);
                    } else if (args.length === 0) {
                        let featureStatus = '✨ *Bot Features Status:*\n\n';
                        for (const key in features) {
                            featureStatus += ` • *${key}:* ${features[key] ? '🟢 On' : '🔴 Off'}\n`;
                        }
                        featureStatus += '\n_Use `!features <feature_name> <on/off>` to toggle._\n';
                        featureStatus += 'Example: `!features autoReply off`';
                        await message.reply(featureStatus);
                    } else {
                        await message.reply('Invalid usage. Use `!features` to see status, or `!features <feature_name> <on/off>` to toggle.');
                    }
                } else {
                    await message.reply('You are not authorized to use this command.');
                }
                break;

            case 'gpt':
            case 'ai':
                if (features.chatGPT) {
                    // Replace with your actual ChatGPT/OpenAI API key
                    const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY';
                    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY') {
                        await message.reply('ChatGPT feature is enabled but API key is not configured. Please set your OPENAI_API_KEY.');
                        return;
                    }
                    if (!text) {
                        await message.reply('Please provide a query for ChatGPT. Example: `!gpt What is AI?`');
                        return;
                    }
                    try {
                        await message.reply('Thinking...');
                        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                            model: "gpt-3.5-turbo", // or "gpt-4" if you have access
                            messages: [{ role: "user", content: text }],
                        }, {
                            headers: {
                                'Authorization': `Bearer ${OPENAI_API_Key}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        await message.reply(`ChatGPT: ${response.data.choices[0].message.content}`);
                    } catch (error) {
                        console.error('Error with ChatGPT API:', error.response ? error.response.data : error.message);
                        await message.reply('Sorry, I could not get a response from ChatGPT. There might be an issue with the API.');
                    }
                } else {
                    await message.reply('ChatGPT feature is currently disabled.');
                }
                break;

            case 'viewonce':
                if (quotedMessage && quotedMessage.hasMedia && quotedMessage.isViewOnce) {
                    try {
                        const media = await quotedMessage.downloadMedia();
                        await client.sendMessage(message.from, media, { caption: "Here's the view once media!" });
                    } catch (error) {
                        console.error('Error downloading view once media:', error);
                        await message.reply('Failed to download view once media.');
                    }
                } else {
                    await message.reply('Please reply to a "view once" message to download its media.');
                }
                break;

            // --- Download Menu Commands ---

            case 'facebook':
            case 'fb':
                if (!text) { await message.reply('Please provide a Facebook video URL.'); return; }
                await message.reply('Fetching Facebook video...');
                try {
                    // This is a placeholder. You'll need a reliable Facebook video downloader API.
                    // Example (hypothetical API):
                    // const fbApiResponse = await axios.get(`https://api.example.com/fb-downloader?url=${encodeURIComponent(text)}`);
                    // const videoUrl = fbApiResponse.data.videoUrl;
                    // if (videoUrl) {
                    //     const media = await MessageMedia.fromUrl(videoUrl);
                    //     await client.sendMessage(message.from, media);
                    //     await message.reply('Here is your Facebook video!');
                    // } else {
                    //     await message.reply('Could not download Facebook video.');
                    // }
                    await message.reply('Facebook download is not implemented yet. You need to integrate a third-party API for this.');
                } catch (error) {
                    console.error('Error downloading Facebook video:', error);
                    await message.reply('Failed to download Facebook video. Please ensure the URL is valid.');
                }
                break;

            case 'tiktok':
            case 'tiktokdl':
                if (!text) { await message.reply('Please provide a TikTok video URL.'); return; }
                await message.reply('Fetching TikTok video...');
                try {
                    // This is a placeholder. You'll need a reliable TikTok downloader API (e.g., SaveFrom.net, Snaptik, etc.)
                    // These often require web scraping or specific APIs which can change frequently.
                    // Example (hypothetical API):
                    // const ttApiResponse = await axios.get(`https://api.example.com/tiktok-downloader?url=${encodeURIComponent(text)}`);
                    // const videoUrl = ttApiResponse.data.videoUrl;
                    // if (videoUrl) {
                    //     const media = await MessageMedia.fromUrl(videoUrl);
                    //     await client.sendMessage(message.from, media);
                    //     await message.reply('Here is your TikTok video!');
                    // } else {
                    //     await message.reply('Could not download TikTok video.');
                    // }
                    await message.reply('TikTok download is not implemented yet. You need to integrate a third-party API for this.');
                } catch (error) {
                    console.error('Error downloading TikTok video:', error);
                    await message.reply('Failed to download TikTok video. Please ensure the URL is valid.');
                }
                break;

            case 'instagram':
            case 'ig':
                if (!text) { await message.reply('Please provide an Instagram post URL (Reel, Post, IGTV).'); return; }
                await message.reply('Fetching Instagram media...');
                try {
                    // This is a placeholder. Instagram downloaders often require specific APIs or web scraping.
                    await message.reply('Instagram download is not implemented yet. You need to integrate a third-party API for this.');
                } catch (error) {
                    console.error('Error downloading Instagram media:', error);
                    await message.reply('Failed to download Instagram media.');
                }
                break;

            case 'twitter':
                if (!text) { await message.reply('Please provide a Twitter video URL.'); return; }
                await message.reply('Fetching Twitter video...');
                try {
                    // This is a placeholder. Twitter video downloaders are similar to TikTok/FB
                    await message.reply('Twitter download is not implemented yet. You need to integrate a third-party API for this.');
                } catch (error) {
                    console.error('Error downloading Twitter video:', error);
                    await message.reply('Failed to download Twitter video.');
                }
                break;

            case 'youtube': // Generic for YouTube links for play, mp3, mp4, video
            case 'play':
            case 'mp3':
            case 'mp4':
            case 'video':
                if (!text) { await message.reply('Please provide a YouTube video URL or search query for `!play`, `!mp3`, `!mp4`.'); return; }

                if (command === 'play' || command === 'mp3') {
                    await message.reply('Downloading audio from YouTube...');
                    try {
                        const videoId = ytdl.get  ID(text); // Extracts ID if URL is provided
                        const info = await ytdl.getInfo(videoId || text); // Gets info for URL or ID
                        const audioFormat = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
                        if (!audioFormat) {
                            await message.reply('Could not find suitable audio format.');
                            return;
                        }

                        const audioFilePath = path.join(__dirname, `${videoId || 'audio'}.mp3`);
                        const outputStream = require('fs').createWriteStream(audioFilePath);

                        ytdl(videoId || text, { format: audioFormat }).pipe(outputStream);

                        outputStream.on('finish', async () => {
                            const media = MessageMedia.fromFilePath(audioFilePath);
                            await client.sendMessage(message.from, media, { sendMediaAsDocument: true }); // send as doc to avoid WhatsApp compression
                            await fs.unlink(audioFilePath); // Clean up
                        });

                        outputStream.on('error', (err) => {
                            console.error('Error streaming audio:', err);
                            message.reply('Failed to download audio.');
                        });

                    } catch (error) {
                        console.error('Error downloading YouTube audio:', error);
                        await message.reply('Failed to download YouTube audio. Please ensure the URL is valid or try searching first.');
                    }
                } else if (command === 'mp4' || command === 'video' || command === 'youtube') {
                    await message.reply('Downloading video from YouTube...');
                    try {
                        const videoId = ytdl.getID(text);
                        const info = await ytdl.getInfo(videoId || text);
                        const videoFormat = ytdl.chooseFormat(info.formats, { filter: format => format.container === 'mp4' && format.hasVideo && format.hasAudio, quality: 'highest' });
                        if (!videoFormat) {
                            await message.reply('Could not find suitable video format.');
                            return;
                        }

                        const videoFilePath = path.join(__dirname, `${videoId || 'video'}.mp4`);
                        const outputStream = require('fs').createWriteStream(videoFilePath);

                        ytdl(videoId || text, { format: videoFormat }).pipe(outputStream);

                        outputStream.on('finish', async () => {
                            const media = MessageMedia.fromFilePath(videoFilePath);
                            await client.sendMessage(message.from, media);
                            await fs.unlink(videoFilePath); // Clean up
                        });

                        outputStream.on('error', (err) => {
                            console.error('Error streaming video:', err);
                            message.reply('Failed to download video.');
                        });

                    } catch (error) {
                        console.error('Error downloading YouTube video:', error);
                        await message.reply('Failed to download YouTube video. Please ensure the URL is valid.');
                    }
                }
                break;

            case 'yts': // Youtube (requires google-it-safe for simple search)
                if (!text) { await message.reply('Please provide a search query. Example: `!yts latest songs`'); return; }
                await message.reply('Searching YouTube...');
                try {
                    const { google } = require('google-it-safe');
                    const results = await google({ query: `${text} youtube`, limit: 5 }); // Limit to top 5
                    let youtubeResults = '🔍 *Youtube Results:*\n\n';
                    if (results.length > 0) {
                        results.forEach((result, index) => {
                            if (result.link.includes('youtube.com/watch')) { // Filter for actual YouTube video links
                                youtubeResults += `${index + 1}. *${result.title}*\n🔗 ${result.link}\n\n`;
                            }
                        });
                        await message.reply(youtubeResults);
                    } else {
                        await message.reply('No YouTube videos found for your query.');
                    }
                } catch (error) {
                    console.error('Error during Youtube:', error);
                    await message.reply('Failed to perform Youtube.');
                }
                break;

            case 'spotifydl':
                if (!text) { await message.reply('Please provide a Spotify song/playlist URL.'); return; }
                await message.reply('Attempting to download from Spotify...');
                try {
                    // Spotify download requires integration with a third-party API or service
                    // that can rip audio from Spotify, which is generally complex and
                    // might have legal implications depending on usage.
                    await message.reply('Spotify download is complex and requires specific APIs/services which are not directly supported here. You might need to use a dedicated Spotify downloader service via its API.');
                } catch (error) {
                    console.error('Error downloading Spotify:', error);
                    await message.reply('Failed to download from Spotify.');
                }
                break;

            case 'spotifysearch':
                if (!text) { await message.reply('Please provide a Spotify search query.'); return; }
                await message.reply('Searching Spotify...');
                try {
                    // Spotify search requires Spotify API integration (OAuth2 authentication)
                    await message.reply('Spotify search requires Spotify API integration with proper authentication.');
                } catch (error) {
                    console.error('Error searching Spotify:', error);
                    await message.reply('Failed to search Spotify.');
                }
                break;

            case 'pinterestdl':
                if (!text) { await message.reply('Please provide a Pinterest URL.'); return; }
                await message.reply('Downloading from Pinterest...');
                try {
                    // Similar to other downloaders, requires specific API or web scraping
                    await message.reply('Pinterest download is not implemented yet. You need to integrate a third-party API for this.');
                } catch (error) {
                    console.error('Error downloading Pinterest:', error);
                    await message.reply('Failed to download from Pinterest.');
                }
                break;

            case 'img':
                if (!text) { await message.reply('Please provide an image search query.'); return; }
                await message.reply('Searching for images...');
                try {
                    // You'll need an image search API (e.g., Google Custom Search API, Unsplash API)
                    // For a simple example using a public API (replace with a reliable one):
                    const imageSearchUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(text)}&per_page=1`; // Example Pexels API
                    const pexelsApiKey = 'YOUR_PEXELS_API_KEY'; // Get a key from pexels.com/api
                    if (!pexelsApiKey || pexelsApiKey === 'YOUR_PEXELS_API_KEY') {
                        await message.reply('Image search API key not configured. Get one from Pexels.com/api');
                        return;
                    }
                    const response = await axios.get(imageSearchUrl, {
                        headers: { Authorization: pexelsApiKey }
                    });
                    if (response.data.photos.length > 0) {
                        const imageUrl = response.data.photos[0].src.large;
                        const media = await MessageMedia.fromUrl(imageUrl);
                        await client.sendMessage(message.from, media, { caption: `Here's an image for "${text}"` });
                    } else {
                        await message.reply('No images found for your query.');
                    }
                } catch (error) {
                    console.error('Error during image search:', error);
                    await message.reply('Failed to search for images. Check your API key or try another query.');
                }
                break;

            case 'ringtone':
                if (!text) { await message.reply('Please provide a ringtone search query.'); return; }
                await message.reply('Searching for ringtones...');
                try {
                    // Ringtone download typically requires a specific API or web scraping
                    // from a ringtone website (e.g., Zedge, MobCup).
                    await message.reply('Ringtone download is not implemented. You need to integrate a third-party API or service.');
                } catch (error) {
                    console.error('Error searching ringtone:', error);
                    await message.reply('Failed to search for ringtones.');
                }
                break;

            case 'apk':
                if (!text) { await message.reply('Please provide an APK search query.'); return; }
                await message.reply('Searching for APK...');
                try {
                    // APK download usually involves scraping from APK mirror sites, which can be complex and risky.
                    await message.reply('APK download is not directly implemented due to complexity and potential risks. You might need to integrate a third-party APK download API.');
                } catch (error) {
                    console.error('Error searching APK:', error);
                    await message.reply('Failed to search for APK.');
                }
                break;

            case 'ssweb': // Screenshot Web
                if (!text || !text.startsWith('http')) { await message.reply('Please provide a valid URL (e.g., `!ssweb https://google.com`)'); return; }
                await message.reply('Taking screenshot...');
                try {
                    const screenshotUrl = `https://image.thum.io/get/width/1200/crop/800/noanimate/${encodeURIComponent(text)}`;
                    const media = await MessageMedia.fromUrl(screenshotUrl);
                    await client.sendMessage(message.from, media, { caption: `Screenshot of ${text}` });
                } catch (error) {
                    console.error('Error taking screenshot:', error);
                    await message.reply('Failed to take screenshot. Make sure the URL is accessible.');
                }
                break;

            case 'dog':
                await message.reply('Fetching a random dog image...');
                try {
                    const response = await axios.get('https://dog.ceo/api/breeds/image/random');
                    const dogImageUrl = response.data.message;
                    const media = await MessageMedia.fromUrl(dogImageUrl);
                    await client.sendMessage(message.from, media);
                } catch (error) {
                    console.error('Error fetching dog image:', error);
                    await message.reply('Failed to fetch a dog image.');
                }
                break;

            // Mediafire & GDrive are complex. They usually require direct link parsing or specific APIs.
            // case 'mediafire':
            // case 'gdrive':
            //     await message.reply('These downloads are complex and not directly supported. You might need to use specific APIs or tools.');
            //     break;

            default:
                await message.reply(`Sorry, I don't understand that command. Type \`!help\` for a list of commands.`);
                break;
        }
    }
});

// --- Call Handling (AntiCall feature) ---
client.on('call', async call => {
    if (features.antiCall) {
        console.log('Call received from:', call.from);
        await call.reject();
        await client.sendMessage(call.from, 'Sorry, I cannot answer calls. I am a bot.');
        console.log('Call rejected and message sent.');
    }
});


client.initialize();
