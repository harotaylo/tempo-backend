import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const REDIRECT_URI = process.env.REDIRECT_URI;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.get('/auth/slack', (req, res) => {
  const url = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=channels:read,users:read&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(url);
});

app.get('/slack/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error || !code) return res.status(400).json({ error: 'No code' });

    const resp = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: { client_id: SLACK_CLIENT_ID, client_secret: SLACK_CLIENT_SECRET, code, redirect_uri: REDIRECT_URI }
    });

    if (!resp.data.ok) return res.json({ error: resp.data.error });

    const { access_token, team } = resp.data;
    await supabase.from('workspaces').upsert({ slack_team_id: team.id, slack_team_name: team.name, slack_team_domain: team.domain || '', bot_token: access_token }, { onConflict: 'slack_team_id' });

    res.json({ success: true, team: team.name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default app;
