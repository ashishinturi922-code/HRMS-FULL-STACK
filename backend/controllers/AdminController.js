const db = require('../db');
const bcrypt = require('bcrypt');

class AdminController {
    /**
     * 1. DASHBOARD STATS
     */
	async getDashboardStats(req, res) {
	    try {
	        // 1. Get real-time counts from the database
	        const [empRows] = await db.execute('SELECT COUNT(*) as total FROM users');
	        const [projRows] = await db.execute('SELECT COUNT(*) as count FROM projects WHERE status = "Ongoing"');
	        const [doneRows] = await db.execute('SELECT COUNT(*) as count FROM projects WHERE status = "Completed"');
	        const [deptRows] = await db.execute('SELECT COUNT(*) as count FROM departments');

	        // 2. Query the ACTUAL number of employees on approved leave today
	        // We use the column names from_date and to_date as per your DB schema
	        const [leaveRows] = await db.execute(`
	            SELECT COUNT(DISTINCT user_id) as onLeave 
	            FROM leave_requests 
	            WHERE status = 'Approved' 
	            AND CURDATE() BETWEEN from_date AND to_date
	        `);

	        const totalEmployees = empRows[0].total || 0;
	        const onLeaveCount = leaveRows[0].onLeave || 0;
	        
	        // 3. Calculate actual presence (Total Employees - People on Leave)
	        const presentCount = totalEmployees - onLeaveCount;

	        res.json({
	            totalEmployees: totalEmployees,
	            departments: deptRows[0].count || 0,
	            activeProjects: projRows[0].count || 0,
	            completedProjects: doneRows[0].count || 0,
	            present: presentCount,
	            absent: onLeaveCount, 
	            attendanceStats: [
	                { name: "Present", value: presentCount },
	                { name: "On Leave", value: onLeaveCount }
	            ]
	        });
	    } catch (error) {
	        console.error("Dashboard Stats Error:", error);
	        res.status(500).json({ error: "Could not fetch real-time dashboard stats" });
	    }
	}
    /**
     * 2. DEPARTMENT MANAGEMENT
     */
    async getDepartments(req, res) {
        try {
            const [rows] = await db.execute('SELECT * FROM departments ORDER BY id DESC');
            res.json(Array.isArray(rows) ? rows : []); 
        } catch (error) {
            res.status(500).json([]); 
        }
    }

    async addDepartment(req, res) {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ error: "Name is required" });
            await db.execute('INSERT INTO departments (name) VALUES (?)', [name]);
            res.status(201).json({ success: true, message: "Department added successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to add department" });
        }
    }

    async deleteDepartment(req, res) {
        try {
            const { id } = req.params;
            await db.execute('DELETE FROM departments WHERE id = ?', [id]);
            res.json({ success: true, message: "Department deleted successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to delete department" });
        }
    }

    /**
     * 3. USER MANAGEMENT
     */
    async createUser(req, res) {
        try {
            const { firstName, lastName, employeeId, email, phone, password, role, department } = req.body;
            const fullName = `${firstName} ${lastName}`;

            // ✅ Hash the password before saving to DB
            const hashedPassword = await bcrypt.hash(password, 10);

            const sql = `INSERT INTO users (name, username, password, role, department, employee_id, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            await db.execute(sql, [fullName, email, hashedPassword, role, department, employeeId, phone]);

            res.status(201).json({ success: true, message: "User created successfully" });
        } catch (error) {
            console.error("Create User Error:", error);
            res.status(500).json({ error: "Failed to create user" });
        }
    }

    async getAllEmployees(req, res) {
        try {
            const [rows] = await db.execute('SELECT id, name, employee_id, username, role, department, phone, manager_id FROM users');
            res.json(Array.isArray(rows) ? rows : []);
        } catch (error) {
            res.status(500).json([]);
        }
    }

    async getManagers(req, res) {
        try {
            const [rows] = await db.execute('SELECT id, name FROM users WHERE role = "Manager" OR role = "Admin"');
            res.json(Array.isArray(rows) ? rows : []);
        } catch (error) {
            res.status(500).json([]);
        }
    }

    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            await db.execute('DELETE FROM users WHERE id = ?', [id]);
            res.json({ success: true, message: "User deleted successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to delete user" });
        }
    }

    /**
     * 4. PROJECT MANAGEMENT
     */
    async getAllProjects(req, res) {
        try {
            const [rows] = await db.execute('SELECT * FROM projects ORDER BY id DESC');
            res.json(Array.isArray(rows) ? rows : []);
        } catch (error) {
            res.status(500).json([]);
        }
    }

    async createProject(req, res) {
        try {
            const { name, description, managerId, managerName } = req.body;
            const sql = `INSERT INTO projects (name, description, managerId, managerName, status) VALUES (?, ?, ?, ?, 'Ongoing')`;
            await db.execute(sql, [name, description, managerId, managerName]);
            res.status(201).json({ success: true, message: "Project created successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to create project" });
        }
    }

    async updateProjectStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            await db.execute('UPDATE projects SET status = ? WHERE id = ?', [status, id]);
            res.json({ success: true, message: "Project status updated" });
        } catch (error) {
            res.status(500).json({ error: "Failed to update project status" });
        }
    }

    async deleteProject(req, res) {
        try {
            const { id } = req.params;
            await db.execute('DELETE FROM projects WHERE id = ?', [id]);
            res.json({ success: true, message: "Project deleted successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to delete project" });
        }
    }

    /**
     * 5. CALENDAR MANAGEMENT
     */
    async getCalendarEvents(req, res) {
        try {
            const [rows] = await db.execute('SELECT * FROM calendar_events ORDER BY date_key ASC');
            res.json(Array.isArray(rows) ? rows : []);
        } catch (error) {
            res.status(500).json([]);
        }
    }

    async saveCalendarEvent(req, res) {
        try {
            const { id, date, title, description, startTime, endTime, category } = req.body;
            if (id) {
                const sql = `UPDATE calendar_events SET title=?, description=?, start_time=?, end_time=?, category=?, date_key=? WHERE id=?`;
                await db.execute(sql, [title, description, startTime, endTime, category, date, id]);
            } else {
                const sql = `INSERT INTO calendar_events (title, description, start_time, end_time, category, date_key) VALUES (?, ?, ?, ?, ?, ?)`;
                await db.execute(sql, [title, description, startTime, endTime, category, date]);
            }
            res.json({ success: true, message: "Event saved successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to save event" });
        }
    }

    async deleteCalendarEvent(req, res) {
        try {
            const { id } = req.params;
            await db.execute('DELETE FROM calendar_events WHERE id = ?', [id]);
            res.json({ success: true, message: "Event deleted successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to delete event" });
        }
    }

    /**
     * 6. PROFILE & ACCOUNT
     */
    async getProfile(req, res) {
        try {
            const { id } = req.params;
            const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
            if (rows.length > 0) res.json(rows[0]);
            else res.status(404).json({ error: "User not found" });
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch profile" });
        }
    }

    async updateProfile(req, res) {
        try {
            const { id } = req.params;
            const { 
                name, gender, phone, alt_phone, dob, doj, 
                personal_email, username, blood_group, address,
                manager_id 
            } = req.body;

            const sql = `UPDATE users SET 
                name=?, gender=?, phone=?, alt_phone=?, dob=?, doj=?, 
                personal_email=?, username=?, blood_group=?, address=?, 
                manager_id=? 
                WHERE id=?`;
            
            await db.execute(sql, [
                name, gender, phone, alt_phone, 
                dob, doj, personal_email, username, 
                blood_group, address, manager_id, id
            ]);

            res.json({ success: true, message: "Profile Updated Successfully ✅" });
        } catch (error) {
            console.error("Profile Update Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    async updatePassword(req, res) {
        try {
            const { id, currentPassword, newPassword } = req.body;
            const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: "User not found" });

            // ✅ Use bcrypt to compare
            const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
            if (!isMatch) {
                return res.status(401).json({ error: "Current password incorrect" });
            }

            // ✅ Hash the new password before updating
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
            
            res.json({ success: true, message: "Password updated successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to update password" });
        }
    }

    /**
     * 7. LEAVE MANAGEMENT
     */
    async getAllLeaveRequests(req, res) {
        try {
            const sql = `
                SELECT l.*, u.name as employeeName, u.role as employeeRole 
                FROM leave_requests l 
                JOIN users u ON l.user_id = u.id 
                ORDER BY l.id DESC
            `;
            const [rows] = await db.execute(sql);
            res.json(Array.isArray(rows) ? rows : []);
        } catch (error) {
            res.status(500).json([]);
        }
    }

	async getLeaveEmployeesToday(req, res) {
	        try {
	            const sql = `
	                SELECT l.*, u.name as employeeName, u.department, u.role
	                FROM leave_requests l
	                JOIN users u ON l.user_id = u.id
	                WHERE l.status = 'Approved' 
	                AND CURDATE() BETWEEN l.from_date AND l.to_date
	            `;
	            const [rows] = await db.execute(sql);
	            res.json(Array.isArray(rows) ? rows : []);
	        } catch (error) {
	            console.error("Fetch Today's Leaves Error:", error);
	            res.status(500).json([]);
	        }
	    }

    async adminUpdateLeaveStatus(req, res) {
        try {
            const { leaveId } = req.params;
            const { status } = req.body; 
            
            const [leaveData] = await db.execute(
                `SELECT l.id, l.user_id, l.leave_type, u.name as employeeName
                 FROM leave_requests l 
                 JOIN users u ON l.user_id = u.id 
                 WHERE l.id = ?`, 
                [leaveId]
            );
            
            if (leaveData.length === 0) return res.status(404).json({ error: "Leave not found" });

            const leave = leaveData[0];
            await db.execute('UPDATE leave_requests SET status = ? WHERE id = ?', [status, leaveId]);
            
            await this.createAdminLeaveNotification(leave.user_id, leave.employeeName, leave.leave_type, status);
            
            res.json({ success: true, message: `Leave ${status} successfully` });
        } catch (error) {
            res.status(500).json({ error: "Failed to update leave status" });
        }
    }

    /**
     * 8. TIMESHEET MANAGEMENT
     */
    async getAllAdminTimesheets(req, res) {
        try {
            const sql = `
                SELECT t.*, u.role, u.employee_id, u.name 
                FROM timesheets t
                JOIN users u ON t.user_id = u.id
                ORDER BY t.task_date DESC
            `;
            const [rows] = await db.execute(sql);
            res.json(Array.isArray(rows) ? rows : []);
        } catch (error) {
            console.error("Fetch Timesheets Error:", error);
            res.status(500).json([]);
        }
    }

    async updateTimesheetStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            if (!id || !status) return res.status(400).json({ error: "Missing ID or status" });

            const [timesheetData] = await db.execute(
                `SELECT t.user_id, u.name as employeeName
                 FROM timesheets t 
                 JOIN users u ON t.user_id = u.id 
                 WHERE t.id = ?`, [id]
            );
            
            if (timesheetData.length === 0) return res.status(404).json({ error: "Timesheet not found" });

            await db.execute('UPDATE timesheets SET status = ? WHERE id = ?', [status, id]);
            
            await this.createAdminTimesheetNotification(timesheetData[0].user_id, timesheetData[0].employeeName, status);
            
            res.json({ success: true, message: `Timesheet updated to ${status}` });
        } catch (error) {
            res.status(500).json({ error: "Failed to update status" });
        }
    }

    /**
     * 9. NOTIFICATION HELPERS
     */
    async createAdminLeaveNotification(userId, name, leaveType, status) {
        try {
            const message = `Your ${leaveType} leave request has been ${status} by Admin.`;
            await db.execute(
                'INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, "Leave", 0)',
                [userId, message]
            );
        } catch (error) {
            console.error("Leave Notification Error:", error);
        }
    }

    async createAdminTimesheetNotification(userId, name, status) {
        try {
            const message = `Your timesheet entry has been ${status} by Admin.`;
            await db.execute(
                'INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, "Timesheet", 0)',
                [userId, message]
            );
        } catch (error) {
            console.error("Timesheet Notification Error:", error);
        }
    }
}

module.exports = new AdminController();