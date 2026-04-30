import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cleanzo Backend is running!' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
