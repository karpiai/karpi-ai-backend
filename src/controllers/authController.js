import { supabase } from "../config/supabase.js";

export const registerStudent = async (req, res) => {
  // 1. Trim the input immediately to remove accidental spaces
  const name = req.body.name?.trim();
  const rollNo = req.body.rollNo?.trim();
  const accessCode = req.body.accessCode?.trim();

  console.log(`🔐 Registration Attempt for: [${name}] | Code: [${accessCode}]`);

  const { data: allRows } = await supabase.from('institutions').select('access_code');
  console.log("🔍 All Codes in DB:", allRows.map(r => `[${r.access_code}]`));

  try {
    // 2. Search using ilike AND trim the database field on the fly
    // Note: We use a raw filter here to ensure the DB side is also trimmed
    const { data: institutions, error: instErr } = await supabase
      .from('institutions')
      .select('id, name, access_code')
      .ilike('access_code', accessCode);

    console.log("Database Response:", { institutions, instErr });

    if (instErr || !institutions || institutions.length === 0) {
      return res.status(401).json({
        message: `Invalid Code: ${accessCode}. Please check your institution code.`
      });
    }

    const inst = institutions[0];

    // 3. Upsert Student
    const { data: student, error: stdErr } = await supabase
      .from('students')
      .upsert({
        full_name: name,
        roll_no: rollNo,
        institution_id: inst.id
      }, { onConflict: 'institution_id, roll_no' })
      .select()
      .single();

    if (stdErr) throw stdErr;

    res.status(200).json({
      collegeName: inst.name,
      studentName: student.full_name,
      token: "mock-jwt-token"
    });

  } catch (error) {
    console.error("Supabase Auth Error:", error);
    res.status(500).json({ message: "Database connection failed." });
  }
};