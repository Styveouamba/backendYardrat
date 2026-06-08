import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './db/connection';
import authRoutes from './routes/authRoutes';
import transferRoutes from './routes/transferRoutes';
import paymentRoutes from './routes/paymentRoutes';

// Charger les variables d'environnement
dotenv.config();

// Créer l'application Express
const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connecter à MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/payment', paymentRoutes);

// Route de test
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Bienvenue sur l\'API Yardrat',
    version: '1.0.0'
  });
});

// Gestion des routes non trouvées
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT} en mode ${process.env.NODE_ENV}`);
});
