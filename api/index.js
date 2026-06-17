import express from 'express';
import axios from 'axios';
import cors from 'cors';
const app = express();
app.use(cors());
app.get('/', (req, res) => res.json({ test: 'ok' }));
export default app;
