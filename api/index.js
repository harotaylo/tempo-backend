import express from 'express';
const app = express();
app.get('/', (req, res) => res.json({ test: 'ok' }));
export default app;
