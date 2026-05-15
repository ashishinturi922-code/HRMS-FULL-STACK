const db = require('../db');
const bcrypt = require('bcrypt');

class AdminController {
    /**
     * 1. DASHBOARD STATS
     */
	async getDashboardStats(req, res) {
	    try {
	        const [empRows] = await db.execute('SELECT COUNT(*) as total FROM users');
	        const [projRows] = await db.execute('SELECT COUNT(*) as count FROM projects WHERE status = "Ongoing"');
	        const [doneRows] = await db.execute('SELECT COUNT(*) as count FROM projects WHERE status = "Completed"');
	        const [deptRows] = await db.execute('SELECT COUNT(*) as count FROM departments');

	        // ✅ FIX: UNION both tables so Team Leaders are counted too
	        const [leaveRows] = await db.execute(`
	            SELECT COUNT(*) as onLeave FROM (
	                SELECT DISTINCT user_id AS uid
	                FROM leave_requests
	                WHERE status = 'Approved'
	                AND CURDATE() BETWEEN DATE(from_date) AND DATE(to_date)
	                UNION
	                SELECT DISTINCT tl_user_id AS uid
	                FROM tl_leave_requests
	                WHERE status = 'Approved'
	                AND CURDATE() BETWEEN DATE(from_date) AND DATE(to_date)
	            ) AS combined
	        `);

	        const totalEmployees = empRows[0].total || 0;
	        const onLeaveCount = leaveRows[0].onLeave || 0;
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
            const [rows] = await db.execute(
                `SELECT id, title, description, category, start_time, end_time,
                        DATE_FORMAT(date_key, '%Y-%m-%d') AS date_key
                 FROM calendar_events
                 ORDER BY date_key ASC`
            );
            res.json(Array.isArray(rows) ? rows : []);
        } catch (error) {
            res.status(500).json([]);
        }
    }

    async saveCalendarEvent(req, res) {
        try {
            const {
                id,
                date,
                title,
                description,
                category,
                startTime = null,
                endTime = null
            } = req.body;

            if (!title || !date) {
                return res.status(400).json({ error: "Title and date are required" });
            }

            const plainDate = date.split("T")[0];

            if (id) {
                const sql = `UPDATE calendar_events 
                             SET title=?, description=?, start_time=?, end_time=?, category=?, date_key=? 
                             WHERE id=?`;
                await db.execute(sql, [
                    title,
                    description || null,
                    startTime,
                    endTime,
                    category || null,
                    plainDate,
                    id
                ]);
            } else {
                const sql = `INSERT INTO calendar_events (title, description, start_time, end_time, category, date_key) 
                             VALUES (?, ?, ?, ?, ?, ?)`;
                await db.execute(sql, [
                    title,
                    description || null,
                    startTime,
                    endTime,
                    category || null,
                    plainDate
                ]);
            }

            res.json({ success: true, message: "Event saved successfully" });
        } catch (error) {
            console.error("Save Calendar Event Error:", error);
            res.status(500).json({ error: "Failed to save event: " + error.message });
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
                name,
                gender,
                phone,
                alt_phone,
                dob,
                doj,
                personal_email,
                username,
                blood_group,
                address,
                manager_id = null  // ✅ FIX: default to null — Admin profile never sends this,
                                   //         and mysql2 throws if a bind param is undefined
            } = req.body;

            const sql = `UPDATE users SET 
                name=?, gender=?, phone=?, alt_phone=?, dob=?, doj=?, 
                personal_email=?, username=?, blood_group=?, address=?, 
                manager_id=? 
                WHERE id=?`;

            await db.execute(sql, [
                name         || null,
                gender       || null,
                phone        || null,
                alt_phone    || null,
                dob          || null,
                doj          || null,
                personal_email || null,
                username     || null,
                blood_group  || null,
                address      || null,
                manager_id,          // already null by default
                id
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

            const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
            if (!isMatch) {
                return res.status(401).json({ error: "Current password incorrect" });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

            res.json({ success: true, message: "Password updated successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to update password" });
        }
    }

    // ✅ FIX: Upload profile photo for Admin
    async uploadPhoto(req, res) {
        try {
            const { id } = req.params;
            if (!req.file) return res.status(400).json({ error: "No file uploaded" });

            const photoUrl = `/uploads/profiles/${req.file.filename}`;
            await db.execute('UPDATE users SET profile_photo = ? WHERE id = ?', [photoUrl, id]);

            res.json({ success: true, photoUrl });
        } catch (error) {
            console.error("Upload Photo Error:", error);
            res.status(500).json({ error: "Failed to upload photo" });
        }
    }

    // ✅ FIX: Upload document (Aadhar / PAN / Certificate) for Admin
    async uploadDoc(req, res) {
        try {
            const { id } = req.params;
            if (!req.file) return res.status(400).json({ error: "No file uploaded" });

            const { type } = req.body;
            const allowed = ['aadhar_path', 'pan_path', 'certificate_path'];
            if (!allowed.includes(type)) {
                return res.status(400).json({ error: "Invalid document type" });
            }

            const docUrl = `/uploads/documents/${req.file.filename}`;
            await db.execute(`UPDATE users SET ${type} = ? WHERE id = ?`, [docUrl, id]);

            res.json({ success: true, docUrl });
        } catch (error) {
            console.error("Upload Doc Error:", error);
            res.status(500).json({ error: "Failed to upload document" });
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
	                SELECT u.id, u.name, u.employee_id, u.department, u.role,
	                       l.leave_type, l.status
	                FROM leave_requests l
	                JOIN users u ON l.user_id = u.id
	                WHERE l.status = 'Approved'
	                AND CURDATE() BETWEEN DATE(l.from_date) AND DATE(l.to_date)

	                UNION

	                SELECT u.id, u.name, u.employee_id, u.department, u.role,
	                       tl.leave_type, tl.status
	                FROM tl_leave_requests tl
	                JOIN users u ON tl.tl_user_id = u.id
	                WHERE tl.status = 'Approved'
	                AND CURDATE() BETWEEN DATE(tl.from_date) AND DATE(tl.to_date)

	                ORDER BY name ASC
	            `;
	            const [rows] = await db.execute(sql);
	            res.json({ employees: Array.isArray(rows) ? rows : [] });
	        } catch (error) {
	            console.error("Fetch Today's Leaves Error:", error);
	            res.status(500).json({ employees: [] });
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

    /**
     * 10. RESIGNATION MANAGEMENT (Fix #7 — was missing)
     */
    async getAllResignations(req, res) {
        try {
            const [rows] = await db.execute(`
                SELECT r.*, u.name, u.employee_id, u.department, u.role
                FROM resignations r
                JOIN users u ON r.user_id = u.id
                ORDER BY r.id DESC
            `);
            res.json(Array.isArray(rows) ? rows : []);
        } catch (error) {
            console.error('Get Resignations Error:', error);
            res.status(500).json({ error: 'Failed to fetch resignations' });
        }
    }

    async updateResignationStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, admin_remarks } = req.body;
            const allowed = ['Pending', 'Approved', 'Rejected'];
            if (!allowed.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }
            await db.execute(
                'UPDATE resignations SET status = ?, admin_remarks = ? WHERE id = ?',
                [status, admin_remarks || null, id]
            );
            res.json({ success: true, message: `Resignation ${status}` });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update resignation' });
        }
    }

    /**
     * 11. OFFER LETTER MANAGEMENT (Fix #7 — was missing)
     */
    async getAllOffers(req, res) {
        try {
            const [rows] = await db.execute('SELECT * FROM offer_letters ORDER BY id DESC');
            res.json(Array.isArray(rows) ? rows : []);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch offer letters' });
        }
    }

    async createOffer(req, res) {
        try {
            const { candidate_name, position, department, joining_date, salary, remarks } = req.body;
            if (!candidate_name || !position) {
                return res.status(400).json({ error: 'Candidate name and position are required' });
            }
            await db.execute(
                `INSERT INTO offer_letters (candidate_name, position, department, joining_date, salary, remarks, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'Issued')`,
                [candidate_name, position, department || null, joining_date || null, salary || null, remarks || null]
            );
            res.status(201).json({ success: true, message: 'Offer letter created' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create offer letter' });
        }
    }

    async deleteOffer(req, res) {
        try {
            const { id } = req.params;
            await db.execute('DELETE FROM offer_letters WHERE id = ?', [id]);
            res.json({ success: true, message: 'Offer letter deleted' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete offer letter' });
        }
    }
}

module.exports = new AdminController();
