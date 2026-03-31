import { supabase } from "../config/supabase.js";

export const getInstitutionMetrics = async (req, res) => {
    try {
        const { accessCode } = req.body;

        if (!accessCode) {
            return res.status(400).json({ error: "Access code is required." });
        }

        const { data: institution, error: instError } = await supabase
            .from('institutions')
            .select('id, name') 
            .eq('access_code', accessCode)
            .maybeSingle(); 

        if (instError || !institution) {
            return res.status(401).json({ error: "Invalid Institution Access Code." });
        }

        console.log(`📊 Admin Login Success: Fetching metrics for ${institution.name}`);

        // --- UPDATED: Using department_name, program_name, and medium ---
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('name, roll_no, department_name, program_name, semester, medium, total_tokens_used')
            .eq('institution_id', institution.id)
            .order('total_tokens_used', { ascending: false }); 

        if (studentError) throw studentError;

        const metrics = students.map(student => {
            const tokens = student.total_tokens_used || 0;
            return {
                name: student.name,
                rollNumber: student.roll_no,
                program: student.program_name,         // New
                department: student.department_name,   // Updated
                semester: student.semester,
                medium: student.medium,                // New
                wordsUsed: Math.floor(tokens / 1.3) 
            };
        });

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

export const getInstitutionLogs = async (req, res) => {
    try {
        const { accessCode } = req.body;

        if (!accessCode) {
            return res.status(400).json({ error: "Access code is required." });
        }

        const { data: institution, error: instError } = await supabase
            .from('institutions')
            .select('id, name')
            .eq('access_code', accessCode)
            .maybeSingle(); 

        if (instError || !institution) {
            return res.status(401).json({ error: "Invalid Access Code." });
        }

        // --- UPDATED: Fetching the renamed columns + the Subject's medium ---
        const { data: logs, error: logError } = await supabase
            .from('usage_logs')
            .select(`
                id, mode, topic, created_at,
                students (name, roll_no, department_name, program_name, semester),
                subjects (subject_name, medium)
            `)
            .eq('institution_id', institution.id)
            .order('created_at', { ascending: false })
            .limit(500); 

        if (logError) throw logError;

        const formattedLogs = logs.map(log => ({
            id: log.id,
            mode: log.mode,
            topic: log.topic,
            createdAt: new Date(log.created_at).toLocaleString('en-IN'), 
            studentName: log.students?.name || 'Deleted User',
            rollNumber: log.students?.roll_no || 'N/A',
            program: log.students?.program_name || 'N/A',            // New
            department: log.students?.department_name || 'N/A',      // Updated
            semester: log.students?.semester || 'N/A',
            // We can now show the Admin exactly which language the student used!
            subjectName: log.subjects ? `${log.subjects.subject_name} (${log.subjects.medium})` : 'General / Not Selected' 
        }));

        res.status(200).json({ success: true, logs: formattedLogs });

    } catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({ error: "Internal server error fetching logs." });
    }
};