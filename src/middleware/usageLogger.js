import { supabase } from '../config/supabase.js';

export const usageLogger = async (req, res, next) => {
  try {
    // 1. SAFETY CHECK: Only process POST requests with a body
    // If it's a GET request (like /stats) or has no body, skip logging
    if (req.method !== 'POST' || !req.body || Object.keys(req.body).length === 0) {
      return next(); 
    }

    const { collegeName, studentName, topic } = req.body;
    
    // 2. SKIP IF NO COLLEGE: Don't log if collegeName is missing 
    // (This helps avoid errors if req.body exists but is for something else)
    if (!collegeName) {
      return next();
    }

    const mode = req.path.split('/').pop();

    // ... rest of your existing supabase logging logic ...
    const { data: inst } = await supabase
      .from('institutions')
      .select('id')
      .eq('name', collegeName)
      .single();

    if (inst) {
      await supabase.from('usage_logs').insert({
        institution_id: inst.id,
        mode: mode,
        topic: topic || 'General Query'
      });
      console.log(`📊 Logged: ${collegeName} | ${studentName} | ${mode.toUpperCase()}`);
    }
  } catch (err) {
    console.error("🚨 Usage Logger System Error:", err.message);
  }

  next();
};