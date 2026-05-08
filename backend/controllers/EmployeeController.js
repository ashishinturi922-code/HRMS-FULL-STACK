const db = require('../db');

class EmployeeController {
    // ✅ HELPER: CALCULATE WORKING DAYS (EXCLUDE WEEKENDS)
    calculateWorkingDays(fromDate, toDate) {
        let count = 0;
        let current = new Date(fromDate);
        const endDate = new Date(toDate);

        while (current <= endDate) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) count++; // 0=Sun, 6=Sat
            current.setDate(current.getDate() + 1);
        }

        return count > 0 ? count : 0;
    }

    // 1. GET DASHBOARD STATS
    async getDashboardStats(req, res) {
        try {
            const { empId } = req.params;

            // Get this employee's numeric id AND their string employee_id code (e.g. "ACS1001")
            const [userRows] = await db.execute(
                'SELECT id, employee_id, department FROM users WHERE id = ?',
                [empId]
            );
            if (userRows.length === 0) return res.status(404).json({ error: "Employee not found" });

            const empDept     = userRows[0].department;
            const empCode     = String(userRows[0].employee_id || "").trim(); // e.g. "ACS1001"
            const empNumericId = String(empId).trim();

            // ✅ FIX 1: Total org count — include ALL roles (Employee, TeamLeader, Manager, Admin)
            const [allOrgRows] = await db.execute(
                `SELECT COUNT(*) as total FROM users`
            );
            const totalOrganization = allOrgRows[0].total || 0;

            // ✅ FIX 2: Active & Completed projects for THIS employee
            // Projects table stores employeeIds as a comma-separated string of employee_id codes.
            // We also check managerId (employee_id code) and teamLeaderId (numeric id) columns.
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

            // ✅ FIX 3: On Leave — count across the WHOLE ORGANIZATION (all roles, all departments)
            let leaveCount = 0;
            try {
                const [leaveRows] = await db.execute(
                    `SELECT COUNT(DISTINCT lr.user_id) as count
                     FROM leave_requests lr
                     JOIN users u ON lr.user_id = u.id
                     WHERE lr.status = 'Approved'
                     AND CURRENT_DATE BETWEEN lr.from_date AND lr.to_date`
                );
                leaveCount = leaveRows[0].count || 0;
            } catch (err) {
                console.error("Leave query error:", err.message);
            }

            const presentPeople = totalOrganization - leaveCount;
            const finalPresent  = presentPeople < 0 ? 0 : presentPeople;

            res.json({
                department:        empDept,
                totalEmployees:    totalOrganization,
                presentEmployees:  finalPresent,
                onLeave:           leaveCount,
                activeProjects:    activeProjects,
                completedProjects: completedProjects,
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

    // ✅ 2. APPLY LEAVE - WITH WORKING DAYS CALCULATION & VALIDATION (PAST DATES ALLOWED)
    async applyLeave(req, res) {
        try {
            const { user_id, leave_type, from_date, to_date, reason, session, days } = req.body;

            console.log("📥 Received leave data:", { user_id, leave_type, from_date, to_date, days, reason });

            // ✅ VALIDATE REQUIRED FIELDS
            if (!user_id || !leave_type || !from_date || !to_date || !reason) {
                return res.status(400).json({ error: "Missing required fields: user_id, leave_type, from_date, to_date, reason" });
            }

            // ✅ VALIDATE DATES
            const fromDateObj = new Date(from_date);
            const toDateObj   = new Date(to_date);

            if (fromDateObj > toDateObj) {
                return res.status(400).json({ error: "From date cannot be after to date" });
            }

            // ✅ PREVENT WEEKEND START/END
            const fromDay = fromDateObj.getDay();
            const toDay   = toDateObj.getDay();
            if (fromDay === 0 || fromDay === 6) {
                return res.status(400).json({ error: "Cannot apply leave starting on a weekend" });
            }
            if (toDay === 0 || toDay === 6) {
                return res.status(400).json({ error: "Cannot apply leave ending on a weekend" });
            }

            // ✅ RECALCULATE WORKING DAYS (BACKEND VERIFICATION)
            const calculatedWorkingDays = this.calculateWorkingDays(from_date, to_date);
            
            if (calculatedWorkingDays === 0) {
                return res.status(400).json({ error: "No working days in selected date range (only weekends)" });
            }

            console.log("📊 Backend calculated working days:", calculatedWorkingDays);
            console.log("📊 Frontend sent days:", days);

            // ✅ USE BACKEND CALCULATED DAYS (MORE SECURE)
            let finalDays = calculatedWorkingDays;
            if (leave_type === "Half Day Leave") {
                finalDays = 0.5;
            }

            // ✅ CHECK FOR OVERLAPPING LEAVES
            const [existingLeaves] = await db.execute(
                `SELECT * FROM leave_requests 
                 WHERE user_id = ? 
                 AND status IN ('Pending', 'TL Approved', 'Approved')
                 AND from_date <= ? 
                 AND to_date >= ?`,
                [user_id, to_date, from_date]
            );

            if (existingLeaves && existingLeaves.length > 0) {
                return res.status(400).json({ 
                    error: "You already have a leave request during this period",
                    existingLeave: existingLeaves[0]
                });
            }

            // ✅ INSERT LEAVE REQUEST WITH CALCULATED DAYS
            const sql = `
                INSERT INTO leave_requests 
                (user_id, leave_type, from_date, to_date, reason, days, session, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`;

            await db.execute(sql, [
                user_id, 
                leave_type, 
                from_date, 
                to_date, 
                reason, 
                finalDays, 
                session || null
            ]);

            console.log("✅ Leave applied successfully with", finalDays, "working days (weekends excluded)");

            res.json({ 
                success: true, 
                message: `✅ Leave applied successfully (${finalDays} working days)`,
                daysApplied: finalDays,
                calculatedDays: calculatedWorkingDays
            });

        } catch (error) {
            console.error("❌ Apply Leave Error:", error.message);
            res.status(500).json({ 
                error: "Failed to apply leave", 
                details: error.message 
            });
        }
    }

    // ✅ 3. GET MY LEAVES (FIXED - Proper endpoint)
    async getMyLeaves(req, res) {
        try {
            const { empId } = req.params;

            if (!empId) {
                return res.status(400).json({ error: "Employee ID is required" });
            }

            const [rows] = await db.execute(
                'SELECT * FROM leave_requests WHERE user_id = ? ORDER BY from_date DESC',
                [empId]
            );

            console.log("✅ Leave requests fetched for employee:", empId, "Count:", rows.length);
            
            // ✅ Ensure we always return an array
            res.json(rows && rows.length > 0 ? rows : []);

        } catch (error) {
            console.error("❌ Fetch Leaves Error:", error.message);
            res.status(500).json({ error: "Failed to fetch leaves", details: error.message });
        }
    }

    // ✅ 4. DELETE LEAVE (Updated to allow deletion if status is Pending OR TL Approved)
    async deleteLeave(req, res) {
        try {
            const { leaveId } = req.params;

            if (!leaveId) {
                return res.status(400).json({ error: "Leave ID is required" });
            }

            // ✅ CHECK STATUS BEFORE DELETING
            const [leaveData] = await db.execute(
                'SELECT status FROM leave_requests WHERE id = ?',
                [leaveId]
            );

            if (!leaveData || leaveData.length === 0) {
                return res.status(404).json({ error: "Leave request not found" });
            }

            if (!['Pending', 'TL Approved'].includes(leaveData[0].status)) {
                return res.status(400).json({ 
                    error: `Cannot delete ${leaveData[0].status} leave request` 
                });
            }

            // ✅ DELETE LEAVE REQUEST
            await db.execute(
                'DELETE FROM leave_requests WHERE id = ?',
                [leaveId]
            );

            console.log("✅ Leave request deleted:", leaveId);
            res.json({ success: true, message: "Leave request deleted successfully" });

        } catch (error) {
            console.error("❌ Delete Leave Error:", error.message);
            res.status(500).json({ error: "Failed to delete leave request" });
        }
    }

    // 5. GET PROFILE
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
            console.error("Get Profile Error:", error.message);
            res.status(500).json({ error: "Database error" });
        }
    }

    // 6. UPDATE PROFILE
    async updateProfile(req, res) {
        try {
            const { userId, name, phone, personalEmail, officialEmail, address, gender, dob, altPhone, bloodGroup, photo } = req.body;
            const safeDob = (dob && dob.trim() !== "") ? dob : null;

            const sql = `
                UPDATE users 
                SET name=?, phone=?, personal_email=?, official_email=?, address=?, gender=?, dob=?, alt_phone=?, blood_group=?, profile_photo=?
                WHERE id=?`;
            
            await db.execute(sql, [
                name || null, phone || null, personalEmail || null, officialEmail || null, 
                address || null, gender || null, safeDob, altPhone || null, 
                bloodGroup || null, photo || null, userId
            ]);
            
            res.json({ success: true, message: "Profile updated successfully" });
        } catch (error) {
            console.error("Update Profile Error:", error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // 7. CHANGE PASSWORD
    async updatePassword(req, res) {
        try {
            const { userId, newPassword } = req.body;
            
            if (!userId || !newPassword) {
                return res.status(400).json({ error: "User ID and new password are required" });
            }

            await db.execute('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);
            res.json({ success: true, message: "Password updated successfully" });
        } catch (error) {
            console.error("Update Password Error:", error.message);
            res.status(500).json({ error: "Failed to update password" });
        }
    }

    // 8. CALENDAR
    async getCalendarEvents(req, res) {
        try {
            // ✅ Return plain date strings (timezone-safe, consistent with AdminController fix)
            const [rows] = await db.execute(
                `SELECT id, title, description, category, start_time, end_time,
                        DATE_FORMAT(date_key, '%Y-%m-%d') AS date_key
                 FROM calendar_events ORDER BY date_key ASC`
            );
            res.json(rows || []);
        } catch (error) {
            console.error("Calendar Fetch Error:", error.message);
            res.status(500).json({ error: "Failed to fetch calendar" });
        }
    }

<<<<<<< HEAD
    // 9. PROJECTS — find projects where this employee is assigned
    async getMyProjects(req, res) {
        try {
            const { empId } = req.params;
=======
   // 9. PROJECTS
	    async getMyProjects(req, res) {
	        try {
	            const { empId } = req.params;
>>>>>>> 8123286f8c8411ce164d7e89a3eaee37521f5a5d

	            if (!empId) {
	                return res.status(400).json({ error: "Employee ID is required" });
	            }

	            const [userRows] = await db.execute(
	                "SELECT employee_id FROM users WHERE id = ?",
	                [empId]
	            );

	            if (!userRows.length) {
	                return res.json([]);
	            }

<<<<<<< HEAD
            // The string ID (e.g., "ACS1001")
            const empCode = String(userRows[0].employee_id).trim();

            // UPDATED QUERY: Check managerId, teamLeaderId, AND employeeIds
            const query = `
                SELECT * FROM projects 
                WHERE managerId = ? 
                   OR teamLeaderId = ? 
                   OR FIND_IN_SET(?, REPLACE(employeeIds, ' ', ''))
                ORDER BY id DESC
            `;

            // Pass the appropriate variables to the ? placeholders in exact order
            const [rows] = await db.execute(query, [empCode, empId, empCode]);
            
            res.json(rows || []);

        } catch (error) {
            console.error("Fetch Projects Error:", error.message);
            res.status(500).json({ error: "Failed to fetch projects" });
        }
    }
=======
	            // The string ID (e.g., "ACS1001")
	            const empCode = String(userRows[0].employee_id).trim();

	            // UPDATED QUERY: Check managerId, teamLeaderId, AND employeeIds
	            const query = `
	                SELECT * FROM projects 
	                WHERE managerId = ? 
	                   OR teamLeaderId = ? 
	                   OR FIND_IN_SET(?, REPLACE(employeeIds, ' ', ''))
	                ORDER BY id DESC
	            `;

	            // Pass the appropriate variables to the ? placeholders in exact order
	            const [rows] = await db.execute(query, [empCode, empId, empCode]);
	            
	            res.json(rows || []);
>>>>>>> 8123286f8c8411ce164d7e89a3eaee37521f5a5d

	        } catch (error) {
	            console.error("Fetch Projects Error:", error.message);
	            res.status(500).json({ error: "Failed to fetch projects" });
	        }
	    }
    // 10. SAVE / SUBMIT TIMESHEET
    async saveTimesheet(req, res) {
        try {
            const { id, user_id, project, task, hours, description, task_date } = req.body;

            if (!user_id || !task_date) {
                return res.status(400).json({ error: "User ID and task date are required" });
            }

            if (id) {
                const sql = `UPDATE timesheets SET project=?, task=?, hours=?, description=?, task_date=? 
                             WHERE id=? AND status='Pending'`;
                await db.execute(sql, [project, task, hours, description, task_date, id]);
            } else {
                const sql = `INSERT INTO timesheets (user_id, project, task, hours, description, task_date, status) 
                             VALUES (?, ?, ?, ?, ?, ?, 'Pending')`;
                await db.execute(sql, [user_id, project, task, hours, description, task_date]);
            }

            res.json({ success: true, message: "Timesheet saved successfully" });

        } catch (error) {
            console.error("Save Timesheet Error:", error.message);
            res.status(500).json({ error: "Failed to save timesheet: " + error.message });
        }
    }

    // 11. GET MY TIMESHEETS
    async getMyTimesheets(req, res) {
        try {
            const { empId } = req.params;

            if (!empId) {
                return res.status(400).json({ error: "Employee ID is required" });
            }

            const [rows] = await db.execute(
                'SELECT * FROM timesheets WHERE user_id = ? ORDER BY task_date DESC, id DESC',
                [empId]
            );

            res.json(rows || []);

        } catch (error) {
            console.error("Fetch Timesheets Error:", error.message);
            res.status(500).json({ error: "Failed to fetch timesheets" });
        }
    }

    // 12. GET DEPARTMENT LEAVE TODAY (Updated — whole org scope)
    async getDepartmentLeaveToday(req, res) {
        try {
            const { empId, date } = req.query;
            
            if (!empId || !date) {
                return res.status(400).json({ error: "empId and date are required" });
            }

            // ✅ FIXED: Return whole-organization employees on leave (not just department)
            const [employees] = await db.execute(
                `SELECT u.id, u.name, u.employee_id, u.role, u.department
                 FROM leave_requests l
                 JOIN users u ON l.user_id = u.id
                 WHERE l.status = 'Approved'
                 AND ? BETWEEN l.from_date AND l.to_date`,
                [date]
            );

            res.json({ employees: employees || [] });

        } catch (error) {
            console.error("Error fetching department leave:", error);
            res.status(500).json({ error: "Failed to fetch leave data" });
        }
    }

    // 13. SUBMIT TIMESHEET (Alternative endpoint)
    async submitTimesheet(req, res) {
        try {
            const { user_id, project, task, hours, description, task_date } = req.body;

            if (!user_id || !task_date) {
                return res.status(400).json({ error: "User ID and task date are required" });
            }

            const sql = `INSERT INTO timesheets (user_id, project, task, hours, description, task_date, status) 
                         VALUES (?, ?, ?, ?, ?, ?, 'Pending')`;
            await db.execute(sql, [user_id, project, task, hours, description, task_date]);

            res.json({ success: true, message: "Timesheet submitted successfully" });

        } catch (error) {
            console.error("Submit Timesheet Error:", error.message);
            res.status(500).json({ error: "Failed to submit timesheet" });
        }
    }
}

module.exports = new EmployeeController();
