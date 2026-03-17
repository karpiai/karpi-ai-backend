import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',           // For your local testing
  'https://karpi-ai-frontend.vercel.app' // Replace with your ACTUAL Vercel URL
];

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
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