import { supabase } from "../config/supabase.js"; // Make sure to import your DB client

export const getInstitutionMetrics = async (req, res) => {
    try {
        const { accessCode } = req.body;

        // 1. Initial Validation
        if (!accessCode) {
            return res.status(400).json({ error: "Access code is required." });
        }

        // 2. Validate against the 'institutions' table
        // We use maybeSingle() so Supabase doesn't throw a fatal error if someone types a wrong code
        const { data: institution, error: instError } = await supabase
            .from('institutions')
            .select('id, name') // NOTE: If your primary key is 'institution_id' instead of 'id', change it here
            .eq('access_code', accessCode)
            .maybeSingle(); 

        if (instError) throw instError;

        // If no matching access code is found in the database
        if (!institution) {
            return res.status(401).json({ error: "Invalid Institution Access Code." });
        }

        console.log(`📊 Admin Login Success: Fetching metrics for ${institution.name}`);

        // 3. Fetch Students from the 'students' table
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('name, roll_no, department, semester, total_tokens_used')
            .eq('institution_id', institution.id)
            .order('total_tokens_used', { ascending: false }); // Most active students at the top

        if (studentError) throw studentError;

        // 4. The "Tokens to Words" Math Translation
        const metrics = students.map(student => {
            const tokens = student.total_tokens_used || 0;
            return {
                name: student.name,
                rollNumber: student.roll_number,
                department: student.department,
                semester: student.semester,
                wordsUsed: Math.floor(tokens / 1.3) // Translates abstract API metrics to educational value
            };
        });

        // 5. Send back the clean data payload
        res.status(200).json({
            success: true,
            institutionName: institution.name, 
            totalStudentsRegistered: metrics.length,
            metrics: metrics
        });

    } catch (error) {
        console.error("Error fetching admin metrics:", error);
        res.status(500).json({ error: "Internal server error fetching metrics." });
    }
};