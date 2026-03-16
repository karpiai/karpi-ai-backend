import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

router.get("/stats", async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('usage_logs')
      .select(`
        id,
        mode,
        institutions ( name )
      `);

    console.log("Fetched logs:", logs);

    if (error) throw error;

    // Use a Map to aggregate data by College Name
    const statsMap = {};

    logs.forEach(log => {
      const collegeName = log.institutions?.name || "Unknown College";

      if (!statsMap[collegeName]) {
        statsMap[collegeName] = {
          name: collegeName,
          students: 0, // We can count these later
          requests: 0,
          status: "Active"
        };
      }
      statsMap[collegeName].requests++;
    });

    res.json(Object.values(statsMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;