import { supabase } from "../config/supabase.js";

export const handleRegistration = async (req, res) => {
  // 1. ADDED: Destructure password from the frontend request
  const { rollNo, accessCode, password } = req.body;

  try {
    const cleanAccessCode = accessCode.trim().toUpperCase();

    const { data: student, error } = await supabase
    .from('students')
    .select(`
        id, 
        name, 
        roll_no, 
        password,
        institution_id, 
        department_name,
        program_name,
        semester,
        department_id,
        medium,
        is_active,
        institutions (
          name,
          is_active,
          access_code
        ),
        departments (
          program_type_id
        )
    `)
    .eq('roll_no', rollNo)
    .single();

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

    // 2. NEW CHECK: Password Validation
    if (student.password !== password) {
      return res.status(401).json({ 
        message: "Invalid Password. Please try again." 
      });
    }

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

    res.status(200).json({
      studentId: student.id,
      institutionId: student.institution_id,
      studentName: student.name, 
      collegeName: student.institutions.name, 
      department: student.department_name, 
      program: student.program_name,       
      semester: student.semester,
      programId: student.departments?.program_type_id,
      departmentId: student.department_id,
      medium: student.medium
    });

  } catch (error) {
    console.error("Auth Controller Error:", error);
    res.status(500).json({ message: "Internal server error during authentication." });
  }
};