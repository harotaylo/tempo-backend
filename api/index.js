import express from 'express';
import axios from 'axios';
const app = express();
app.get('/', (req, res) => res.json({ test: 'ok' }));
export default app;
