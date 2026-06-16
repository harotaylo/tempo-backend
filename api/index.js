import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/slack/callback';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.json({ status: 'Tempo API running', version: '1.0.0' });
});

app.get('/auth/slack', (req, res) => {
  const scope = 'channels:read,users:read,commands,incoming-webhook';
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${scope}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(slackAuthUrl);
});

app.get('/slack/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: error });
  }

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    const tokenResponse = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
      },
    });

    const { access_token, team, user } = tokenResponse.data;

    if (!tokenResponse.data.ok) {
      return res.status(400).json({ error: tokenResponse.data.error });
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .upsert(
        {
          slack_team_id: team.id,
          slack_team_name: team.name,
          slack_team_domain: team.domain,
          bot_token: access_token,
        },
        { onConflict: 'slack_team_id' }
      )
      .select();

    if (workspaceError) {
      return res.status(500).json({ error: 'Failed to store workspace', details: workspaceError });
    }

    res.json({ 
      status: 'success',
      workspace_id: workspace[0].id,
      team_name: team.name,
      message: 'Workspace connected! You can now start tracking response times.'
    });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/workspaces', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Tempo API listening on port ${PORT}`);
});

export default app;
