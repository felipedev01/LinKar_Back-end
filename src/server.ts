import express from 'express';
import authRoutes from './routes/auth';

const app = express();
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);

app.listen(3002, () => {
  console.log('Server running on port 3000');
});