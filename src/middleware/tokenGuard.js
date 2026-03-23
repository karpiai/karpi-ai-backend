// middleware/tokenGuard.js
import { supabase } from "../config/supabase.js";

export const tokenGuard = async (req, res, next) => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ error: "Student ID is required for verification." });
        }

        // Fetch current usage and limit
        const { data: student, error } = await supabase
            .from('students')
            .select('total_tokens_used, monthly_token_limit, is_active')
            .eq('id', studentId)
            .single();

        if (error || !student) {
            return res.status(404).json({ error: "Student record not found." });
        }

        if (!student.is_active) {
            return res.status(403).json({ error: "Account is inactive. Contact your college admin." });
        }

        // Check if limit is exceeded
        if (BigInt(student.total_tokens_used) >= BigInt(student.monthly_token_limit)) {
            return res.status(403).json({ 
                error: "Monthly AI limit reached. Please contact your administrator to upgrade your plan." 
            });
        }

        next(); // Proceed to AI controller if under limit
    } catch (err) {
        console.error("Token Guard Error:", err);
        res.status(500).json({ error: "Internal security check failed." });
    }
};