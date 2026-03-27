import { supabase } from '../config/supabase.js';

export const usageLogger = async (req, res, next) => {
  try {
    if (req.method !== 'POST' || !req.body || Object.keys(req.body).length === 0) {
      return next(); 
    }

    // Notice we capture subjectId (which is currently the string "tnteu-sem1-psychology")
    const { institutionId, studentId, topic, subjectId } = req.body;
    
    if (!institutionId || !studentId) {
      return next();
    }

    const mode = req.path.split('/').pop();
    let dbSubjectId = null;

    // Resolve the Vector DB string to our internal Subject UUID
    if (subjectId) {
        const { data: subjectInfo } = await supabase
            .from('subjects')
            .select('id')
            .eq('collection_name', subjectId)
            .single();
            
        if (subjectInfo) {
            dbSubjectId = subjectInfo.id;
        }
    } else {
        // If no subjectId provided, we can optionally link to a default "General" subject or leave it null
        // For now, we'll just leave it null to indicate it's a general query not tied to a specific subject.
        dbSubjectId = null;
    }

    // Insert the log with the linked subject
    const { error } = await supabase.from('usage_logs').insert({
      institution_id: institutionId,
      student_id: studentId,
      subject_id: dbSubjectId, // The new relational link!
      mode: mode,
      topic: topic || 'General Query'
    });

    console.log(`Logged usage for Student ID: ${studentId} | Mode: ${mode} | Subject ID: ${dbSubjectId}`);

    if (error) throw error;
    
  } catch (err) {
    console.error("🚨 Usage Logger Error:", err.message);
  }

  next();
};