import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(express.json());
app.use(cors());

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const REDIRECT_URI = 'https://tempo-backend-ecru.vercel.app/slack/callback';

app.get('/', (req, res) => res.json({ status: 'ok', client_id: SLACK_CLIENT_ID ? 'set' : 'NOT SET' }));

app.get('/auth/slack', (req, res) => {
  if (!SLACK_CLIENT_ID) return res.status(400).json({ error: 'Client ID not set' });
  const url = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=channels:read,users:read&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(url);
});

app.get('/slack/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.json({ error: 'No code' });

    const resp = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: { client_id: SLACK_CLIENT_ID, client_secret: SLACK_CLIENT_SECRET, code, redirect_uri: REDIRECT_URI }
    });

    res.json({ slack_response: resp.data });
  } catch (e) {
    res.json({ error: e.message });
  }
});

export default app;
