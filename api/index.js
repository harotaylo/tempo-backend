import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());
app.use(cors());

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const REDIRECT_URI = 'https://tempo-backend-ecru.vercel.app/slack/callback';

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.get('/auth/slack', (req, res) => {
  const url = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=channels:read,users:read&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(url);
});

app.get('/slack/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.json({ error: 'No code' });
  
  const resp = await axios.post('https://slack.com/api/oauth.v2.access', null, {
    params: { client_id: SLACK_CLIENT_ID, client_secret: SLACK_CLIENT_SECRET, code, redirect_uri: REDIRECT_URI }
  });
  
  res.json({ ok: resp.data.ok, team: resp.data.team?.name });
});

export default app;
