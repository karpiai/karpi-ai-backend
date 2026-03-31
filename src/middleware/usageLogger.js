import { supabase } from '../config/supabase.js';

export const usageLogger = async (req, res, next) => {
  try {
    if (req.method !== 'POST' || !req.body || Object.keys(req.body).length === 0) {
      return next(); 
    }

    // subjectId is NOW exactly the UUID sent from the React frontend!
    const { institutionId, studentId, topic, subjectId } = req.body;
    
    if (!institutionId || !studentId) {
      return next();
    }

    const mode = req.path.split('/').pop();
    
    // We no longer need a Supabase lookup! We just ensure it's a valid string, otherwise null.
    const dbSubjectId = (subjectId && subjectId.trim() !== "") ? subjectId : null;

    // Insert the log with the direct UUID link
    const { error } = await supabase.from('usage_logs').insert({
      institution_id: institutionId,
      student_id: studentId,
      subject_id: dbSubjectId, 
      mode: mode,
      topic: topic || 'General Query'
    });

    if (error) throw error;

    console.log(`Logged usage for Student ID: ${studentId} | Mode: ${mode} | Subject UUID: ${dbSubjectId}`);
    
  } catch (err) {
    console.error("🚨 Usage Logger Error:", err.message);
  }

  next();
};