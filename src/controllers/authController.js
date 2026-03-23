import { supabase } from "../config/supabase.js";

export const handleRegistration = async (req, res) => {
  const { name, rollNo, accessCode } = req.body;

  try {
    const cleanAccessCode = accessCode.trim().toUpperCase();

    // 1. Fetch Student AND Institution data in a single relational query
    const { data: student, error } = await supabase
      .from('students')
      .select(`
        id, 
        name, 
        department, 
        semester, 
        is_active,
        institutions (
          name,
          access_code,
          is_active
        )
      `)
      .eq('roll_no', rollNo.trim())
      .single();

    // 2. Student Identity & Status Checks
    if (error || !student) {
      return res.status(404).json({ 
        message: "Roll Number not found in the institution's roster. Please check your ID." 
      });
    }

    if (!student.is_active) {
      return res.status(403).json({ 
        message: "Your student account is inactive. Please contact your administrator." 
      });
    }

    // 3. Institution Level Checks (The SaaS Guardrails)
    if (!student.institutions) {
      return res.status(500).json({ 
        message: "Database configuration error: Student not linked to an institution." 
      });
    }

    if (!student.institutions.is_active) {
      return res.status(403).json({ 
        message: "Access Denied: The institutional license for this college is currently suspended." 
      });
    }

    if (student.institutions.access_code !== cleanAccessCode) {
      return res.status(401).json({ 
        message: "Invalid College Access Code for this Roll Number." 
      });
    }

    // 4. Return the fully dynamic Profile Payload
    res.status(200).json({
      studentId: student.id,
      studentName: student.name, 
      collegeName: student.institutions.name, 
      department: student.department,
      semester: student.semester
    });

  } catch (error) {
    console.error("Auth Controller Error:", error);
    res.status(500).json({ message: "Internal server error during authentication." });
  }
};