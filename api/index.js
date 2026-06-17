import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());
app.use(cors());

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const REDIRECT_URI = 'https://tempo-backend-ecru.vercel.app/slack/callback';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.get('/', (req, res) => res.json({ status: 'Tempo API running' }));

app.get('/auth/slack', (req, res) => {
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

    if (!resp.data.ok) return res.json({ error: resp.data.error });

    const { access_token, team } = resp.data;

    // Save to Supabase
    const { data, error } = await supabase.from('workspaces').upsert({
      slack_team_id: team.id,
      slack_team_name: team.name,
      slack_team_domain: team.domain || '',
      bot_token: access_token,
    }, { onConflict: 'slack_team_id' }).select();

    if (error) return res.json({ error: error.message, saved: false });

    res.json({ success: true, workspace_id: data[0].id, team_name: team.name, saved: true });
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.get('/api/workspaces', async (req, res) => {
  const { data, error } = await supabase.from('workspaces').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default app;
