/* eslint-disable no-console */

require('dotenv').config();
require('ts-node').register({ transpileOnly: true });

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const {
  Client,
  GatewayIntentBits,
  ChannelType,
} = require('discord.js');

const { GoogleGenerativeAI } = require('@google/generative-ai');

/* ============================================================
   ENV
============================================================ */

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = Number(process.env.PORT || 8787);

// Spotify OAuth
const SPOTIFY_CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI  = process.env.SPOTIFY_REDIRECT_URI || `http://localhost:${PORT}/callback`;

if (!DISCORD_TOKEN) throw new Error('Missing DISCORD_TOKEN');
if (!GUILD_ID) throw new Error('Missing GUILD_ID');

const genAI = GEMINI_API_KEY
  ? new GoogleGenerativeAI(GEMINI_API_KEY)
  : null;

if (!genAI) console.warn('[ai] GEMINI_API_KEY not set');

/* ============================================================
   EXPRESS
============================================================ */

const app = express();

app.use(cors({
  origin: "http://localhost:3000"
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

/* ============================================================
   SPOTIFY — FAN SCORE
============================================================ */

// Maps concert IDs to their Spotify artist names for scoring.
// Keep in sync with src/data/concerts.ts
const SPOTIFY_EVENTS = {
  '1':  { name: 'Neon Dreams Tour',              artist: 'The Midnight Echoes' },
  '2':  { name: 'Celestial Sound Experience',    artist: 'Luna Rise' },
  '3':  { name: 'Blockchain Beats Festival',     artist: 'Digital Pulse' },
  '4':  { name: 'Unplugged & Unchained',         artist: 'Acoustic Souls' },
  '5':  { name: 'Decentralized Sound Tour',      artist: 'Rhythm Chain' },
  '6':  { name: 'Galaxy Tour 2026',              artist: 'Stellar Harmony' },
  '7':  { name: 'Smooth Grooves Night',          artist: 'The Jazz Collective' },
  '8':  { name: 'Rock Revolution Tour',          artist: 'Thunder Road' },
  '9':  { name: 'Blockchain Classics',           artist: 'Symphony Orchestra Berlin' },
  '10': { name: 'Country Roads Festival',        artist: 'Wildfire Country Band' },
  '11': { name: 'Metal Mayhem World Tour',       artist: 'Iron Legion' },
  '12': { name: 'Island Rhythms Festival',       artist: 'Reggae Vibes' },
  '13': { name: 'Salsa Heat Night',              artist: 'Fuego Latino' },
  '14': { name: 'Techno Underground',            artist: 'Cyber Beat' },
  '15': { name: 'Blues Heritage Tour',           artist: 'Delta Blues Legends' },
};

// 1️⃣  Generate Spotify auth URL
app.get('/auth-url', (req, res) => {
  const eventId = req.query.eventId;
  if (!eventId || !SPOTIFY_EVENTS[eventId]) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }
  if (!SPOTIFY_CLIENT_ID) {
    return res.status(500).json({ error: 'Spotify credentials not configured' });
  }

  const scopes = 'user-top-read user-read-recently-played user-library-read';
  const authUrl =
    `https://accounts.spotify.com/authorize` +
    `?client_id=${SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${eventId}`;

  res.json({ url: authUrl });
});

// 2️⃣  Handle callback, score the fan, redirect to frontend
app.get('/callback', async (req, res) => {
  const { code, state: eventId } = req.query;
  if (!code)    return res.status(400).send('No authorization code received');
  if (!eventId || !SPOTIFY_EVENTS[eventId]) return res.status(400).send('Invalid event');

  const TARGET_ARTIST = SPOTIFY_EVENTS[eventId].artist;

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  SPOTIFY_REDIRECT_URI,
        client_id:     SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const accessToken = tokenRes.data.access_token;
    const headers = { Authorization: `Bearer ${accessToken}` };

    let score = 0;

    // Top Artists (50 pts if top-3, 25 pts if top-10)
    const topArtists = (await axios.get(
      'https://api.spotify.com/v1/me/top/artists?limit=10&time_range=long_term',
      { headers },
    )).data.items;
    const rank = topArtists.findIndex(
      (a) => a.name.toLowerCase() === TARGET_ARTIST.toLowerCase(),
    );
    if (rank >= 0 && rank <= 2)  score += 50;
    else if (rank >= 3)          score += 25;

    // Recently Played (20 pts if 3+ tracks)
    const recent = (await axios.get(
      'https://api.spotify.com/v1/me/player/recently-played?limit=50',
      { headers },
    )).data.items;
    const recentCount = recent.filter((i) =>
      i.track.artists.some((a) => a.name.toLowerCase() === TARGET_ARTIST.toLowerCase()),
    ).length;
    if (recentCount >= 3) score += 20;

    // Saved Albums (30 pts)
    const savedAlbums = (await axios.get(
      'https://api.spotify.com/v1/me/albums?limit=50',
      { headers },
    )).data.items;
    const hasSaved = savedAlbums.some((i) =>
      i.album.artists.some((a) => a.name.toLowerCase() === TARGET_ARTIST.toLowerCase()),
    );
    if (hasSaved) score += 30;

    console.log(`[spotify] event=${eventId} artist=${TARGET_ARTIST} score=${score}`);
    res.redirect(`http://localhost:3000/concert/${eventId}?score=${score}`);

  } catch (err) {
    console.error('[spotify] callback error:', err.response?.data || err.message);
    res.status(500).send('Error during Spotify verification');
  }
});

/* ============================================================
   DISCORD CLIENT
============================================================ */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let isDiscordReady = false;

client.once('ready', () => {
  console.log(`[discord] logged in as ${client.user.tag}`);
  isDiscordReady = true;
});

client.on('error', (err) => {
  console.error('[discord] client error:', err);
});

client.login(DISCORD_TOKEN);

/* ============================================================
   CREATE SQUAD ENDPOINT
============================================================ */

app.post('/api/create-squad', async (req, res) => {
  try {
    const { ticketId, concertName, concertId } = req.body;

    if (!ticketId || !concertName) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (!isDiscordReady) {
      return res.status(503).json({ error: 'Discord not ready yet' });
    }

    const guild = await client.guilds.fetch(GUILD_ID);

    if (!guild) {
      return res.status(500).json({ error: 'Guild not found' });
    }

    const channelName = `squad-${concertId || 'general'}-${Date.now()}`;

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: `ConcertID: ${concertId || 'none'} | TicketID: ${ticketId}`,
    });

    const invite = await channel.createInvite({
      maxAge: 0,
      maxUses: 0,
    });

    return res.json({
      inviteUrl: invite.url,
      channelId: channel.id,
    });

  } catch (err) {
    console.error('[create-squad error]', err);
    return res.status(500).json({
      error: 'Failed to create squad',
      message: err.message
    });
  }
});

/* ============================================================
   AI MESSAGE HANDLER
============================================================ */

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!genAI) return;

  try {
    await message.channel.sendTyping();

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const result = await model.generateContent(
      `You are a friendly Discord AI assistant. User said: "${message.content}". Reply naturally and friendly.`
    );

    const reply = result.response.text().trim();

    if (reply) {
      await message.channel.send(reply);
    }

  } catch (err) {
    console.error('[ai] error', err);
  }
});

/* ============================================================
   START SERVER
============================================================ */

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});