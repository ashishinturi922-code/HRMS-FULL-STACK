const db = require('../db');
const bcrypt = require('bcrypt');

class AuthController {
    async login(req, res) {
        const { username, password } = req.body;
        try {
            // 1. Fetch user by username only
            const [rows] = await db.execute(
                'SELECT id, username, password, role, name, email, department FROM users WHERE username = ?',
                [username]
            );

            if (rows.length > 0) {
                const user = rows[0];

                // 2. Use bcrypt to verify the plain-text password against the stored hash
                const isMatch = await bcrypt.compare(password, user.password);

                if (isMatch) {
                    res.status(200).json({
                        success: true,
                        user: {
                            id: user.id,
                            username: user.username,
                            role: user.role,
                            name: user.name,
                            email: user.email,
                            department: user.department
                        }
                    });
                } else {
                    res.status(401).json({ success: false, message: "Invalid credentials" });
                }
            } else {
                res.status(401).json({ success: false, message: "Invalid credentials" });
            }
        } catch (error) {
            console.error("Login Logic Error:", error);
            res.status(500).json({ success: false, message: "Server connection error" });
        }
    }
}

module.exports = new AuthController();