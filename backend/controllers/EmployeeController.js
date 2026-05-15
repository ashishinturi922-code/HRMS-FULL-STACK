const db = require('../db');
const bcrypt = require('bcrypt');

class EmployeeController {

    // ─────────────────────────────────────────────
    //  HELPER: CALCULATE WORKING DAYS (EXCLUDE WEEKENDS)
    // ─────────────────────────────────────────────
    calculateWorkingDays(fromDate, toDate) {
        let count = 0;
        let current = new Date(fromDate);
        const endDate = new Date(toDate);
        while (current <= endDate) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) count++;
            current.setDate(current.getDate() + 1);
        }
        return count > 0 ? count : 0;
    }

    // ─────────────────────────────────────────────
    //  1. DASHBOARD STATS
    // ─────────────────────────────────────────────
    async getDashboardStats(req, res) {
        try {
            const { empId } = req.params;

            const [userRows] = await db.execute(
                'SELECT id, employee_id, department FROM users WHERE id = ?',
                [empId]
            );
            if (userRows.length === 0) return res.status(404).json({ error: "Employee not found" });

            const empDept      = userRows[0].department;
            const empCode      = String(userRows[0].employee_id || "").trim();
            const empNumericId = String(empId).trim();

            // Total org count
            const [allOrgRows] = await db.execute(`SELECT COUNT(*) as total FROM users`);
            const totalOrganization = allOrgRows[0].total || 0;

            // Active & Completed projects
            let activeProjects = 0;
            let completedProjects = 0;
            try {
                const [projects] = await db.execute(
                    `SELECT status FROM projects 
                     WHERE managerId = ?
                        OR teamLeaderId = ?
                        OR FIND_IN_SET(?, REPLACE(employeeIds, ' ', ''))`,
                    [empCode, empNumericId, empCode]
                );
                activeProjects    = projects.filter(p => p.status === 'Ongoing' || p.status === 'Active').length;
                completedProjects = projects.filter(p => p.status === 'Completed').length;
            } catch (err) {
                console.error("Project query error:", err.message);
            }

            // On Leave — ONLY leave_requests + tl_leave_requests (WFH excluded intentionally)
            let leaveCount = 0;
            try {
                const [leaveRows] = await db.execute(
                    `SELECT COUNT(*) as count FROM (
                        SELECT DISTINCT lr.user_id AS uid
                        FROM leave_requests lr
                        WHERE lr.status = 'Approved'
                        AND CURRENT_DATE BETWEEN DATE(lr.from_date) AND DATE(lr.to_date)
                        UNION
                        SELECT DISTINCT tl.tl_user_id AS uid
                        FROM tl_leave_requests tl
                        WHERE tl.status = 'Approved'
                        AND CURRENT_DATE BETWEEN DATE(tl.from_date) AND DATE(tl.to_date)
                    ) AS combined`
                );
                leaveCount = leaveRows[0].count || 0;
            } catch (err) {
                console.error("Leave query error:", err.message);
            }

            const finalPresent = Math.max(0, totalOrganization - leaveCount);

            res.json({
                department:        empDept,
                totalEmployees:    totalOrganization,
                presentEmployees:  finalPresent,
                onLeave:           leaveCount,
                activeProjects,
                completedProjects,
                attendanceStats: [
                    { name: "Present", value: finalPresent },
                    { name: "Leave",   value: leaveCount  }
                ]
            });

        } catch (error) {
            console.error("Dashboard Stats Error:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    // ─────────────────────────────────────────────
    //  2. APPLY LEAVE
    // ─────────────────────────────────────────────
    async applyLeave(req, res) {
        try {
            const { user_id, leave_type, from_date, to_date, reason, session, days } = req.body;

            if (!user_id || !leave_type || !from_date || !to_date || !reason) {
                return res.status(400).json({ error: "Missing required fields: user_id, leave_type, from_date, to_date, reason" });
            }

            const fromDateObj = new Date(from_date);
            const toDateObj   = new Date(to_date);

            if (fromDateObj > toDateObj) {
                return res.status(400).json({ error: "From date cannot be after to date" });
            }

            const fromDay = fromDateObj.getDay();
            const toDay   = toDateObj.getDay();
            if (fromDay === 0 || fromDay === 6) return res.status(400).json({ error: "Cannot apply leave starting on a weekend" });
            if (toDay   === 0 || toDay   === 6) return res.status(400).json({ error: "Cannot apply leave ending on a weekend" });

            const calculatedWorkingDays = this.calculateWorkingDays(from_date, to_date);
            if (calculatedWorkingDays === 0) {
                return res.status(400).json({ error: "No working days in selected date range (only weekends)" });
            }

            let finalDays = leave_type === "Half Day Leave" ? 0.5 : calculatedWorkingDays;

            // Overlap check
            const [existingLeaves] = await db.execute(
                `SELECT * FROM leave_requests 
                 WHERE user_id = ? AND status IN ('Pending', 'TL Approved', 'Approved')
                 AND from_date <= ? AND to_date >= ?`,
                [user_id, to_date, from_date]
            );
            if (existingLeaves && existingLeaves.length > 0) {
                return res.status(400).json({ error: "You already have a leave request during this period" });
            }

            await db.execute(
                `INSERT INTO leave_requests (user_id, leave_type, from_date, to_date, reason, days, session, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
                [user_id, leave_type, from_date, to_date, reason, finalDays, session || null]
            );

            console.log("✅ Leave applied:", finalDays, "days for user", user_id);
            res.json({ success: true, message: `✅ Leave applied successfully (${finalDays} working days)`, daysApplied: finalDays });

        } catch (error) {
            console.error("❌ Apply Leave Error:", error.message);
            res.status(500).json({ error: "Failed to apply leave", details: error.message });
        }
    }

    // ─────────────────────────────────────────────
    //  3. GET MY LEAVES
    // ─────────────────────────────────────────────
    async getMyLeaves(req, res) {
        try {
            const { empId } = req.params;
            if (!empId) return res.status(400).json({ error: "Employee ID is required" });

            const [rows] = await db.execute(
                'SELECT * FROM leave_requests WHERE user_id = ? ORDER BY from_date DESC',
                [empId]
            );
            res.json(rows || []);
        } catch (error) {
            console.error("❌ Fetch Leaves Error:", error.message);
            res.status(500).json({ error: "Failed to fetch leaves", details: error.message });
        }
    }

    // ─────────────────────────────────────────────
    //  4. DELETE LEAVE
    // ─────────────────────────────────────────────
    async deleteLeave(req, res) {
        try {
            const { leaveId } = req.params;
            if (!leaveId) return res.status(400).json({ error: "Leave ID is required" });

            const [leaveData] = await db.execute('SELECT status FROM leave_requests WHERE id = ?', [leaveId]);
            if (!leaveData || leaveData.length === 0) return res.status(404).json({ error: "Leave request not found" });

            if (!['Pending', 'TL Approved'].includes(leaveData[0].status)) {
                return res.status(400).json({ error: `Cannot delete ${leaveData[0].status} leave request` });
            }

            await db.execute('DELETE FROM leave_requests WHERE id = ?', [leaveId]);
            res.json({ success: true, message: "Leave request deleted successfully" });
        } catch (error) {
            console.error("❌ Delete Leave Error:", error.message);
            res.status(500).json({ error: "Failed to delete leave request" });
        }
    }

    // ─────────────────────────────────────────────
    //  5. GET PROFILE
    // ─────────────────────────────────────────────
    async getProfile(req, res) {
        try {
            const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.empId]);
            if (rows.length === 0) return res.status(404).json({ error: "Profile not found" });
            const user = rows[0];
            res.json({
                ...user,
                personalEmail: user.personal_email,
                officialEmail: user.official_email,
                altPhone:      user.alt_phone,
                bloodGroup:    user.blood_group,
                photo:         user.profile_photo
            });
        } catch (error) {
            res.status(500).json({ error: "Database error" });
        }
    }

    // ─────────────────────────────────────────────
    //  6. UPDATE PROFILE
    // ─────────────────────────────────────────────
    async updateProfile(req, res) {
        try {
            const { userId, name, phone, personalEmail, officialEmail, address, gender, dob, altPhone, bloodGroup, photo } = req.body;
            const safeDob = (dob && dob.trim() !== "") ? dob : null;

            await db.execute(
                `UPDATE users 
                 SET name=?, phone=?, personal_email=?, official_email=?, address=?, gender=?, dob=?, alt_phone=?, blood_group=?, profile_photo=?
                 WHERE id=?`,
                [name || null, phone || null, personalEmail || null, officialEmail || null,
                 address || null, gender || null, safeDob, altPhone || null,
                 bloodGroup || null, photo || null, userId]
            );
            res.json({ success: true, message: "Profile updated successfully" });
        } catch (error) {
            console.error("Update Profile Error:", error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // ─────────────────────────────────────────────
    //  7. CHANGE PASSWORD
    // ─────────────────────────────────────────────
    async updatePassword(req, res) {
        try {
            const { userId, currentPassword, newPassword } = req.body;
            if (!userId || !newPassword) return res.status(400).json({ error: 'User ID and new password are required' });

            const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
            if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
            if (currentPassword) {
                const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
                if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
            res.json({ success: true, message: 'Password updated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update password' });
        }
    }

    // ─────────────────────────────────────────────
    //  8. CALENDAR
    // ─────────────────────────────────────────────
    async getCalendarEvents(req, res) {
        try {
            const [rows] = await db.execute(
                `SELECT id, title, description, category, start_time, end_time,
                        DATE_FORMAT(date_key, '%Y-%m-%d') AS date_key
                 FROM calendar_events ORDER BY date_key ASC`
            );
            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch calendar" });
        }
    }

    // ─────────────────────────────────────────────
    //  9. MY PROJECTS
    // ─────────────────────────────────────────────
    async getMyProjects(req, res) {
        try {
            const { empId } = req.params;
            if (!empId) return res.status(400).json({ error: "Employee ID is required" });

            const [userRows] = await db.execute("SELECT employee_id FROM users WHERE id = ?", [empId]);
            if (!userRows.length) return res.json([]);

            const empCode = String(userRows[0].employee_id).trim();
            const [rows] = await db.execute(
                `SELECT * FROM projects 
                 WHERE managerId = ? OR teamLeaderId = ?
                    OR FIND_IN_SET(?, REPLACE(employeeIds, ' ', ''))
                 ORDER BY id DESC`,
                [empCode, empId, empCode]
            );
            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch projects" });
        }
    }

    // ─────────────────────────────────────────────
    //  10. SAVE TIMESHEET
    // ─────────────────────────────────────────────
    async saveTimesheet(req, res) {
        try {
            const { id, user_id, project, task, hours, description, task_date } = req.body;
            if (!user_id || !task_date) return res.status(400).json({ error: "User ID and task date are required" });

            if (id) {
                await db.execute(
                    `UPDATE timesheets SET project=?, task=?, hours=?, description=?, task_date=? WHERE id=? AND status='Pending'`,
                    [project, task, hours, description, task_date, id]
                );
            } else {
                await db.execute(
                    `INSERT INTO timesheets (user_id, project, task, hours, description, task_date, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
                    [user_id, project, task, hours, description, task_date]
                );
            }
            res.json({ success: true, message: "Timesheet saved successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to save timesheet: " + error.message });
        }
    }

    // ─────────────────────────────────────────────
    //  11. GET MY TIMESHEETS
    // ─────────────────────────────────────────────
    async getMyTimesheets(req, res) {
        try {
            const { empId } = req.params;
            if (!empId) return res.status(400).json({ error: "Employee ID is required" });

            const [rows] = await db.execute(
                'SELECT * FROM timesheets WHERE user_id = ? ORDER BY task_date DESC, id DESC',
                [empId]
            );
            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch timesheets" });
        }
    }

    // ─────────────────────────────────────────────
    //  12. SUBMIT TIMESHEET (alternative endpoint)
    // ─────────────────────────────────────────────
    async submitTimesheet(req, res) {
        try {
            const { user_id, project, task, hours, description, task_date } = req.body;
            if (!user_id || !task_date) return res.status(400).json({ error: "User ID and task date are required" });

            await db.execute(
                `INSERT INTO timesheets (user_id, project, task, hours, description, task_date, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
                [user_id, project, task, hours, description, task_date]
            );
            res.json({ success: true, message: "Timesheet submitted successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to submit timesheet" });
        }
    }

    // ─────────────────────────────────────────────
    //  13. DEPARTMENT LEAVE TODAY
    // ─────────────────────────────────────────────
    async getDepartmentLeaveToday(req, res) {
        try {
            const { empId, date } = req.query;
            if (!empId || !date) return res.status(400).json({ error: "empId and date are required" });

            // WFH is intentionally excluded — this only shows employees on actual leave
            const [employees] = await db.execute(
                `SELECT u.id, u.name, u.employee_id, u.role, u.department
                 FROM leave_requests l
                 JOIN users u ON l.user_id = u.id
                 WHERE l.status = 'Approved'
                 AND ? BETWEEN DATE(l.from_date) AND DATE(l.to_date)

                 UNION

                 SELECT u.id, u.name, u.employee_id, u.role, u.department
                 FROM tl_leave_requests tl
                 JOIN users u ON tl.tl_user_id = u.id
                 WHERE tl.status = 'Approved'
                 AND ? BETWEEN DATE(tl.from_date) AND DATE(tl.to_date)

                 ORDER BY name ASC`,
                [date, date]
            );
            res.json({ employees: employees || [] });
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch leave data" });
        }
    }

    // ─────────────────────────────────────────────
    //  14. SUBMIT RESIGNATION
    // ─────────────────────────────────────────────
    async submitResignation(req, res) {
        try {
            const { user_id, reason, last_working_date } = req.body;
            if (!user_id || !reason) return res.status(400).json({ error: 'user_id and reason are required' });

            const [existing] = await db.execute(
                "SELECT id FROM resignations WHERE user_id = ? AND status IN ('Pending','Approved')",
                [user_id]
            );
            if (existing.length) return res.status(409).json({ error: 'A resignation is already submitted' });

            await db.execute(
                "INSERT INTO resignations (user_id, reason, last_working_date, status) VALUES (?, ?, ?, 'Pending')",
                [user_id, reason, last_working_date || null]
            );
            res.status(201).json({ success: true, message: 'Resignation submitted' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to submit resignation' });
        }
    }

    // ─────────────────────────────────────────────
    //  15. GET MY RESIGNATION
    // ─────────────────────────────────────────────
    async getMyResignation(req, res) {
        try {
            const { empId } = req.params;
            const [rows] = await db.execute(
                'SELECT * FROM resignations WHERE user_id = ? ORDER BY id DESC LIMIT 1',
                [empId]
            );
            res.json(rows[0] || null);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch resignation' });
        }
    }

    // ─────────────────────────────────────────────
    //  16. GET MY OFFER LETTERS
    // ─────────────────────────────────────────────
    async getMyOffers(req, res) {
        try {
            const { empId } = req.params;
            const [userRows] = await db.execute('SELECT name FROM users WHERE id = ?', [empId]);
            if (!userRows.length) return res.status(404).json({ error: 'User not found' });

            const [rows] = await db.execute(
                "SELECT * FROM offer_letters WHERE candidate_name = ? ORDER BY id DESC",
                [userRows[0].name]
            );
            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch offers' });
        }
    }

    // ══════════════════════════════════════════════
    //  WFH — WORK FROM HOME  (NEW — was missing)
    //  Stored in `wfh_requests` (separate from leave_requests)
    //  so WFH never appears in the "On Leave" dashboard count.
    // ══════════════════════════════════════════════

    // ─────────────────────────────────────────────
    //  17. APPLY WFH
    // ─────────────────────────────────────────────
    async applyWFH(req, res) {
        try {
            const { user_id, from_date, to_date, reason, days } = req.body;

            if (!user_id || !from_date || !to_date || !reason) {
                return res.status(400).json({ error: "Missing required fields: user_id, from_date, to_date, reason" });
            }

            const fromDateObj = new Date(from_date);
            const toDateObj   = new Date(to_date);

            if (fromDateObj > toDateObj) {
                return res.status(400).json({ error: "From date cannot be after to date" });
            }

            const fromDay = fromDateObj.getDay();
            const toDay   = toDateObj.getDay();
            if (fromDay === 0 || fromDay === 6) return res.status(400).json({ error: "Cannot apply WFH starting on a weekend" });
            if (toDay   === 0 || toDay   === 6) return res.status(400).json({ error: "Cannot apply WFH ending on a weekend" });

            const calculatedDays = this.calculateWorkingDays(from_date, to_date);
            if (calculatedDays === 0) {
                return res.status(400).json({ error: "No working days in selected date range" });
            }

            // Overlap check — only block if another Pending/Approved WFH exists in range
            const [existing] = await db.execute(
                `SELECT id FROM wfh_requests
                 WHERE user_id = ? AND status IN ('Pending', 'TL Approved', 'Approved')
                 AND from_date <= ? AND to_date >= ?`,
                [user_id, to_date, from_date]
            );
            if (existing && existing.length > 0) {
                return res.status(400).json({ error: "You already have a WFH request during this period" });
            }

            await db.execute(
                `INSERT INTO wfh_requests (user_id, from_date, to_date, days, reason, status)
                 VALUES (?, ?, ?, ?, ?, 'Pending')`,
                [user_id, from_date, to_date, calculatedDays, reason]
            );

            console.log("✅ WFH applied:", calculatedDays, "days for user", user_id);
            res.json({ success: true, message: `✅ WFH request submitted (${calculatedDays} days)`, daysApplied: calculatedDays });

        } catch (error) {
            console.error("❌ Apply WFH Error:", error.message);
            res.status(500).json({ error: "Failed to apply WFH", details: error.message });
        }
    }

    // ─────────────────────────────────────────────
    //  18. GET MY WFH REQUESTS
    // ─────────────────────────────────────────────
    async getMyWFH(req, res) {
        try {
            const { empId } = req.params;
            if (!empId) return res.status(400).json({ error: "Employee ID is required" });

            const [rows] = await db.execute(
                'SELECT * FROM wfh_requests WHERE user_id = ? ORDER BY from_date DESC',
                [empId]
            );
            res.json(rows || []);
        } catch (error) {
            console.error("❌ Fetch WFH Error:", error.message);
            res.status(500).json({ error: "Failed to fetch WFH requests" });
        }
    }

    // ─────────────────────────────────────────────
    //  19. DELETE / CANCEL WFH REQUEST
    // ─────────────────────────────────────────────
    async deleteWFH(req, res) {
        try {
            const { wfhId } = req.params;
            if (!wfhId) return res.status(400).json({ error: "WFH ID is required" });

            const [rows] = await db.execute('SELECT status FROM wfh_requests WHERE id = ?', [wfhId]);
            if (!rows || rows.length === 0) return res.status(404).json({ error: "WFH request not found" });

            if (!['Pending', 'TL Approved'].includes(rows[0].status)) {
                return res.status(400).json({ error: `Cannot cancel a ${rows[0].status} WFH request` });
            }

            await db.execute('DELETE FROM wfh_requests WHERE id = ?', [wfhId]);
            console.log("✅ WFH request cancelled:", wfhId);
            res.json({ success: true, message: "WFH request cancelled successfully" });
        } catch (error) {
            console.error("❌ Delete WFH Error:", error.message);
            res.status(500).json({ error: "Failed to cancel WFH request" });
        }
    }
}

module.exports = new EmployeeController();