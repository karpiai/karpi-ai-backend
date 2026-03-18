import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

const originsEnv = process.env.ALLOWED_ORIGINS || 'http://localhost:5173';
const allowedOrigins = originsEnv.split(',');

// 1. Configure CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    console.log(`🔍 CORS request from: ${origin}`);
    
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ Allowed CORS request from: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`🚫 Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use("/api", authRoutes);
app.use("/api", aiRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Karpi AI Server running on http://localhost:${PORT}`);
  console.log(`🛡️ Institutional Auth: Active`);
});