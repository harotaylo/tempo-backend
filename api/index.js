import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const REDIRECT_URI = 'https://tempo-backend-ecru.vercel.app/slack/callback';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

app.get('/', (req, res) => res.json({ status: 'ok' }));

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
    
    // Save to Supabase (fire and forget)
    fetch(`${SUPABASE_URL}/rest/v1/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        slack_team_id: team.id,
        slack_team_name: team.name,
        bot_token: access_token,
      }),
    }).catch(e => console.error('Save error:', e));
    
    res.json({ success: true, team: team.name, token: 'received' });
  } catch (e) {
    res.json({ error: e.message });
  }
});

export default app;
