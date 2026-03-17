import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://karpi-ai-frontend.vercel.app' // Ensure this is exactly what you see in the browser address bar
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use("/api", authRoutes); // Handles /api/register
app.use("/api", aiRoutes);   // Handles /api/learn, /api/exam, etc.
app.use("/api/admin", adminRoutes); // Handles /api/admin/stats

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Karpi AI Server running on http://localhost:${PORT}`);
  console.log(`🛡️ Institutional Auth: Active`);
});