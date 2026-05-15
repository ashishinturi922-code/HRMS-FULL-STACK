const db = require('../db');
const bcrypt = require('bcrypt');

class TeamLeaderController {

    // 1. TL DASHBOARD STATS
    async getDashboardStats(req, res) {
        try {
            const tlId = req.params.tlId;
            if (!tlId || tlId === 'undefined') {
                return res.status(400).json({ error: "Team Lead ID is required." });
            }

            const [tlInfo] = await db.execute(
                'SELECT department FROM users WHERE id = ?',
                [tlId]
            );

            if (tlInfo.length === 0) {
                return res.status(404).json({ error: "Team Lead not found." });
            }

            const dept = tlInfo[0].department;

            // Get ALL employees, team leaders, AND managers in ORGANIZATION
            const [allOrgRows] = await db.execute(
                // ✅ FIX: Include Admin in total employee count
                `SELECT COUNT(*) as total FROM users`
            );

            const totalOrganization = allOrgRows[0].total || 0;

            // Active Projects assigned to this TL
            const [projRows] = await db.execute(
                `SELECT COUNT(*) as count FROM projects 
                 WHERE teamLeaderId = ? AND status = 'Ongoing'`,
                [tlId]
            );

            // Completed Projects
            const [compRows] = await db.execute(
                `SELECT COUNT(*) as count FROM projects 
                 WHERE teamLeaderId = ? AND status = 'Completed'`,
                [tlId]
            );

            // Pending Timesheets (team members in department only)
            const [timeRows] = await db.execute(
                `SELECT COUNT(*) as count FROM timesheets t 
                 JOIN users u ON t.user_id = u.id 
                 WHERE u.department = ? 
                 AND t.status = "Pending" 
                 AND u.role = "Employee"`,
                [dept]
            );

            // Get leave count for employees, team leaders, AND managers in DEPARTMENT
            // ✅ FIX: UNION both tables so Team Leaders are counted too
            const [leaveRows] = await db.execute(
                `SELECT COUNT(*) as count FROM (
                    SELECT DISTINCT l.user_id AS uid
                    FROM leave_requests l
                    JOIN users u ON l.user_id = u.id
                    WHERE u.department = ?
                    AND l.status = 'Approved'
                    AND CURRENT_DATE BETWEEN DATE(l.from_date) AND DATE(l.to_date)
                    UNION
                    SELECT DISTINCT tl.tl_user_id AS uid
                    FROM tl_leave_requests tl
                    JOIN users u ON tl.tl_user_id = u.id
                    WHERE u.department = ?
                    AND tl.status = 'Approved'
                    AND CURRENT_DATE BETWEEN DATE(tl.from_date) AND DATE(tl.to_date)
                ) AS combined`,
                [dept, dept]
            );

            // Get total count for DEPARTMENT
            const [deptTotalRows] = await db.execute(
                `SELECT COUNT(*) as total FROM users 
                 WHERE department = ? 
                 AND (role = 'Employee' 
                      OR UPPER(TRIM(REPLACE(role, ' ', ''))) = 'TEAMLEADER'
                      OR UPPER(TRIM(role)) = 'TEAM LEADER'
                      OR role = 'TeamLeader'
                      OR role = 'Team Leader'
                      OR role = 'Manager')`,
                [dept]
            );

            const totalDept = deptTotalRows[0].total || 0;
            const onLeaveCount = leaveRows[0].count || 0;
            // ✅ FIX: Use totalOrganization as the base so pie chart matches the stat card
            const presentCount = Math.max(0, totalOrganization - onLeaveCount);

            res.json({
                totalEmployees: totalOrganization,
                activeProjects: projRows[0].count || 0,
                completedProjects: compRows[0].count || 0,
                pendingTimesheets: timeRows[0].count || 0,
                onLeaveCount: onLeaveCount,
                attendanceStats: [
                    { name: "Present", value: presentCount },
                    { name: "On Leave", value: onLeaveCount }
                ]
            });

        } catch (error) {
            console.error("TL Stats Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    // ✅ ASSIGN EMPLOYEE
    async assignEmployee(req, res) {
        const { projectId } = req.params;
        const { employee_id } = req.body;

        try {
            if (!employee_id) {
                return res.status(400).json({ error: "Employee ID is required" });
            }

            const [rows] = await db.execute(
                "SELECT employeeIds FROM projects WHERE id = ?",
                [projectId]
            );

            if (!rows.length) {
                return res.status(404).json({ error: "Project not found" });
            }

            let existing = rows[0]?.employeeIds || "";
            let empList = existing ? existing.split(",") : [];

            if (!empList.includes(String(employee_id))) {
                empList.push(String(employee_id));
            }

            await db.execute(
                "UPDATE projects SET employeeIds = ? WHERE id = ?",
                [empList.join(","), projectId]
            );

            res.json({ success: true, message: "Employee assigned ✅" });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Assignment failed" });
        }
    }

    // ✅ REMOVE EMPLOYEE
    async removeEmployee(req, res) {
        const { projectId } = req.params;
        const { employee_id } = req.body;

        try {
            const [rows] = await db.execute(
                "SELECT employeeIds FROM projects WHERE id = ?",
                [projectId]
            );

            let existing = rows[0]?.employeeIds || "";
            let empList = existing
                ? existing.split(",").filter(id => id !== String(employee_id))
                : [];

            await db.execute(
                "UPDATE projects SET employeeIds = ? WHERE id = ?",
                [empList.join(","), projectId]
            );

            res.json({ success: true, message: "Employee removed ❌" });

        } catch (err) {
            res.status(500).json({ error: "Remove failed" });
        }
    }

    // ✅ GET PROJECTS
    async getAssignedProjects(req, res) {
        const { tlId } = req.params;
        try {
            const [rows] = await db.execute(
                `SELECT * FROM projects WHERE teamLeaderId = ? ORDER BY id DESC`,
                [tlId]
            );

            const formatted = rows.map(p => ({
                ...p,
                employeeIds: p.employeeIds ? p.employeeIds.split(",") : []
            }));

            res.json(formatted);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch projects" });
        }
    }

    // 3. LEAVE APPROVALS
    async getTeamLeaveRequests(req, res) {
        try {
            const { tlId } = req.params;

            const [userDept] = await db.execute(
                'SELECT department FROM users WHERE id = ?',
                [tlId]
            );

            if (!userDept.length) return res.status(404).json({ error: "TL not found" });
            const dept = userDept[0].department;

            const [rows] = await db.execute(
                `SELECT l.*, u.name as employeeName 
                 FROM leave_requests l 
                 JOIN users u ON l.user_id = u.id 
                 WHERE u.department = ? 
                 AND u.role = 'Employee' 
                 AND l.status = 'Pending'`, 
                [dept]
            );

            res.json(rows);
        } catch (error) {
            console.error("Fetch TL leaves error:", error.message);
            res.status(500).json({ error: "Error fetching leave requests" });
        }
    }

    async approveLeave(req, res) {
        try {
            const { leaveId } = req.params;
            const { status } = req.body;

            if (status === 'Rejected') {
                await db.execute(
                    'UPDATE leave_requests SET status = "Rejected" WHERE id = ?',
                    [leaveId]
                );
                return res.json({ success: true, message: "Leave Rejected ❌" });
            }

            const [leaveData] = await db.execute(
                'SELECT days FROM leave_requests WHERE id = ?',
                [leaveId]
            );

            if (leaveData.length === 0) return res.status(404).json({ error: "Leave not found" });

            const days = parseFloat(leaveData[0].days);
            let finalStatus = 'Approved';

            if (days > 2) {
                finalStatus = 'TL Approved';
            }

            await db.execute(
                'UPDATE leave_requests SET status = ? WHERE id = ?',
                [finalStatus, leaveId]
            );

            res.json({ 
                success: true, 
                message: days > 2 ? "Sent to Manager for final approval" : "Leave Approved ✅" 
            });
        } catch (error) {
            console.error("Approve leave error:", error.message);
            res.status(500).json({ error: "Failed to update leave status" });
        }
    }

    // 4. TL OWN TIMESHEETS
    async getMyTimesheets(req, res) {
        try {
            const { tlId } = req.params;

            const [rows] = await db.execute(
                'SELECT * FROM timesheets WHERE user_id = ? ORDER BY task_date DESC',
                [tlId]
            );

            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch your timesheets" });
        }
    }

    async saveTimesheet(req, res) {
        try {
            const { id, user_id, project, task, hours, description } = req.body;
            const task_date = req.body.task_date || req.body.taskDate;

            if (!user_id || !task_date) {
                return res.status(400).json({ error: "User ID and Task Date required" });
            }

            if (id) {
                await db.execute(
                    `UPDATE timesheets 
                     SET project=?, task=?, hours=?, description=?, task_date=? 
                     WHERE id=? AND status='Pending'`,
                    [project, task, hours, description, task_date, id]
                );
            } else {
                await db.execute(
                    `INSERT INTO timesheets 
                     (user_id, project, task, hours, description, task_date, status) 
                     VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
                    [user_id, project, task, hours, description, task_date]
                );
            }

            res.json({ success: true, message: "Timesheet saved ✅" });

        } catch (error) {
            res.status(500).json({ error: "Failed to save timesheet" });
        }
    }

    async updateTimesheetStatus(req, res) {
        try {
            const { timesheetId } = req.params;
            const { status } = req.body;

            await db.execute(
                'UPDATE timesheets SET status = ? WHERE id = ?',
                [status, timesheetId]
            );

            res.json({ success: true, message: "Status updated ✅" });
        } catch (error) {
            res.status(500).json({ error: "Failed to update status" });
        }
    }

    // 5. PENDING TIMESHEETS APPROVAL
    async getPendingTimesheets(req, res) {
        try {
            const { tlId } = req.params;

            if (!tlId || tlId === 'undefined') {
                return res.status(400).json({ error: "Team Lead ID is required" });
            }

            const [rows] = await db.execute(
                `SELECT t.*, u.name as employeeName, u.employee_id, p.name as projectName
                 FROM timesheets t
                 JOIN users u ON t.user_id = u.id
                 JOIN projects p ON t.project = p.name
                 WHERE p.teamLeaderId = ? AND t.status = 'Pending'
                 ORDER BY t.id DESC`,
                [tlId]
            );

            console.log("✅ Pending timesheets fetched successfully for TL:", tlId, "Count:", rows.length);
            res.json(rows);

        } catch (error) {
            console.error("❌ Error fetching pending timesheets:", error.message);
            res.status(500).json({ 
                error: "Error fetching timesheets", 
                details: error.message,
                hint: "Ensure timesheets have valid project names matching projects table"
            });
        }
    }

    // 6. TEAM
    async getMyTeam(req, res) {
        try {
            const { tlId } = req.params;

            const [userDept] = await db.execute(
                'SELECT department FROM users WHERE id = ?',
                [tlId]
            );

            const dept = userDept[0]?.department;

            const [rows] = await db.execute(
                `SELECT id, name, employee_id, role, phone, official_email 
                 FROM users 
                 WHERE department = ? AND role = "Employee"`,
                [dept]
            );

            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch team" });
        }
    }

    // 7. CALENDAR
    async getCalendarEvents(req, res) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM calendar_events ORDER BY date_key ASC'
            );

            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: "Failed" });
        }
    }

    // 8. PROFILE
    async getProfile(req, res) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM users WHERE id = ?',
                [req.params.id]
            );

            res.json(rows[0]);
        } catch (error) {
            res.status(500).json({ error: "Profile error" });
        }
    }

    async updateProfile(req, res) {
        try {
            // ✅ FIX: Frontend sends the full data object with snake_case DB column names
            const body = req.body;
            // Support both id (from URL param fallback) and explicit userId
            const id = body.id || body.userId || req.params.id;

            if (!id) return res.status(400).json({ error: 'User ID is required' });

            const safeDob = (body.dob && body.dob.trim() !== '') ? body.dob : null;
            const safeDoj = (body.doj && body.doj.trim() !== '') ? body.doj : null;

            await db.execute(
                `UPDATE users
                 SET name=?, phone=?, alt_phone=?, personal_email=?,
                     official_email=?, dob=?, doj=?, blood_group=?,
                     gender=?, address=?
                 WHERE id=?`,
                [
                    body.name        || null,
                    body.phone       || null,
                    body.alt_phone   || null,
                    body.personal_email  || null,
                    body.official_email  || body.username || null,
                    safeDob,
                    safeDoj,
                    body.blood_group || null,
                    body.gender      || null,
                    body.address     || null,
                    id
                ]
            );

            res.json({ success: true, message: 'Profile updated successfully' });
        } catch (error) {
            console.error('TL updateProfile Error:', error);
            res.status(500).json({ error: 'Update failed' });
        }
    }

    async updatePassword(req, res) {
        try {
            // ✅ FIX: Frontend sends 'id', fallback to 'userId' for compatibility
            const { currentPassword, newPassword } = req.body;
            const userId = req.body.id || req.body.userId;

            if (!userId || !newPassword) {
                return res.status(400).json({ error: 'User ID and new password are required' });
            }
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
            console.error('Update Password Error:', error);
            res.status(500).json({ error: 'Security update failed' });
        }
    }

    // ✅ FIX: Upload profile photo for Team Leader
    async uploadPhoto(req, res) {
        try {
            const { id } = req.params;
            if (!req.file) return res.status(400).json({ error: "No file uploaded" });

            const photoUrl = `/uploads/profiles/${req.file.filename}`;
            await db.execute('UPDATE users SET profile_photo = ? WHERE id = ?', [photoUrl, id]);

            res.json({ success: true, photoUrl });
        } catch (error) {
            console.error("TL Upload Photo Error:", error);
            res.status(500).json({ error: "Failed to upload photo" });
        }
    }

    // ============================================
    // 🆕 TL LEAVE REQUEST WORKFLOW
    // ============================================

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

    // ✅ APPLY LEAVE - VALIDATE AND RECALCULATE WORKING DAYS (PAST DATES ALLOWED)
    async applyLeave(req, res) {
        try {
            const { tl_user_id, leave_type, session, from_date, to_date, days, reason } = req.body;

            console.log("📥 Received leave data:", { tl_user_id, leave_type, from_date, to_date, days, reason });

            // ✅ VALIDATE REQUIRED FIELDS
            if (!tl_user_id || !leave_type || !from_date || !to_date || !reason) {
                return res.status(400).json({ error: "Missing required fields: tl_user_id, leave_type, from_date, to_date, reason" });
            }

            // ✅ VALIDATE DATES
            const fromDateObj = new Date(from_date);
            const toDateObj = new Date(to_date);

            if (fromDateObj > toDateObj) {
                return res.status(400).json({ error: "From date cannot be after to date" });
            }

            // ✅ PREVENT WEEKEND START/END
            const fromDay = fromDateObj.getDay();
            const toDay = toDateObj.getDay();
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

            // ✅ GET USER AND DEPARTMENT INFO
            const [userRows] = await db.execute(
                'SELECT department FROM users WHERE id = ?',
                [tl_user_id]
            );

            if (!userRows.length) {
                return res.status(404).json({ error: "Team Leader not found" });
            }

            const department = userRows[0].department;

            // ✅ GET MANAGER FOR THIS DEPARTMENT
            const [mgrRows] = await db.execute(
                'SELECT id FROM users WHERE department = ? AND role = "Manager" LIMIT 1',
                [department]
            );

            if (!mgrRows.length) {
                return res.status(400).json({ error: "No manager assigned to this department" });
            }

            const manager_id = mgrRows[0].id;

            // ✅ INSERT LEAVE REQUEST WITH CALCULATED DAYS
            await db.execute(
                `INSERT INTO tl_leave_requests 
                 (tl_user_id, department, leave_type, session, from_date, to_date, days, reason, manager_id, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
                [tl_user_id, department, leave_type, session || null, from_date, to_date, finalDays, reason, manager_id]
            );

            console.log("✅ Leave applied successfully with", finalDays, "working days (weekends excluded)");

            res.json({ 
                success: true, 
                message: `✅ Leave request submitted (${finalDays} working days)`,
                daysApplied: finalDays,
                calculatedDays: calculatedWorkingDays
            });

        } catch (error) {
            console.error("❌ Apply Leave Error:", error);
            res.status(500).json({ 
                error: "Failed to apply leave", 
                details: error.message 
            });
        }
    }

    // ✅ GET MY LEAVE REQUESTS
    async getMyLeaveRequests(req, res) {
        try {
            const { tlId } = req.params;

            if (!tlId) {
                return res.status(400).json({ error: "Team Leader ID is required" });
            }

            const [rows] = await db.execute(
                `SELECT * FROM tl_leave_requests 
                 WHERE tl_user_id = ? 
                 ORDER BY created_at DESC`,
                [tlId]
            );

            console.log("✅ Leave requests fetched:", rows.length);
            res.json(rows || []);

        } catch (error) {
            console.error("Error fetching leaves:", error);
            res.status(500).json({ error: "Failed to fetch leave requests" });
        }
    }

    // ✅ DELETE LEAVE REQUEST
    async deleteLeaveRequest(req, res) {
        try {
            const { leaveId } = req.params;

            const [rows] = await db.execute(
                'SELECT status FROM tl_leave_requests WHERE id = ?',
                [leaveId]
            );

            if (!rows.length) {
                return res.status(404).json({ error: "Leave request not found" });
            }

            if (rows[0].status !== "Pending") {
                return res.status(400).json({ error: "Can only delete pending requests" });
            }

            await db.execute(
                'DELETE FROM tl_leave_requests WHERE id = ?',
                [leaveId]
            );

            console.log("✅ Leave request deleted:", leaveId);
            res.json({ success: true, message: "✅ Leave request deleted" });

        } catch (error) {
            console.error("❌ Delete Error:", error);
            res.status(500).json({ error: "Failed to delete leave request" });
        }
    }

    // ✅ APPROVE/DENY TL LEAVE (BY MANAGER)
    async approveOrDenyTLLeave(req, res) {
        try {
            const { leaveId } = req.params;
            const { status, manager_reason } = req.body;

            if (!['Approved', 'Denied'].includes(status)) {
                return res.status(400).json({ error: "Invalid status. Must be 'Approved' or 'Denied'" });
            }

            await db.execute(
                `UPDATE tl_leave_requests 
                 SET status = ?, manager_reason = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [status, manager_reason || null, leaveId]
            );

            console.log(`✅ Leave request ${status}:`, leaveId);
            res.json({ success: true, message: `✅ Leave request ${status}` });

        } catch (error) {
            console.error("❌ Approval Error:", error);
            res.status(500).json({ error: "Failed to update leave request" });
        }
    }

    // ✅ GET TEAM LEADER LEAVE REQUESTS (FOR MANAGER)
    async getTeamLeaderLeaveRequests(req, res) {
        try {
            const { managerId } = req.params;

            if (!managerId) {
                return res.status(400).json({ error: "Manager ID is required" });
            }

            const [mgrRows] = await db.execute(
                'SELECT department FROM users WHERE id = ?',
                [managerId]
            );

            if (!mgrRows.length) {
                return res.status(404).json({ error: "Manager not found" });
            }

            const department = mgrRows[0].department;

            const [rows] = await db.execute(
                `SELECT tl.*, u.name as tl_name, u.employee_id
                 FROM tl_leave_requests tl
                 JOIN users u ON tl.tl_user_id = u.id
                 WHERE tl.department = ? AND tl.status = 'Pending'
                 ORDER BY tl.created_at DESC`,
                [department]
            );

            console.log("✅ TL leave requests fetched for manager:", managerId, "Count:", rows.length);
            res.json(rows || []);

        } catch (error) {
            console.error("❌ Error fetching TL leaves:", error);
            res.status(500).json({ error: "Failed to fetch leave requests" });
        }
    }

    // ✅ GET TEAM LEAVE TODAY
    async getTeamLeaveToday(req, res) {
        try {
            const { tlId, date } = req.query;
            
            if (!tlId || !date) {
                return res.status(400).json({ error: "tlId and date are required" });
            }

            const [userDept] = await db.execute(
                'SELECT department FROM users WHERE id = ?',
                [tlId]
            );

            if (!userDept.length) {
                return res.status(404).json({ error: "Team Leader not found" });
            }

            const dept = userDept[0].department;

            // ✅ FIX: UNION both tables so Team Leaders (stored in tl_leave_requests)
            //         appear alongside Employees (stored in leave_requests).
            const [employees] = await db.execute(
                `SELECT u.id, u.name, u.employee_id, u.role
                 FROM leave_requests l
                 JOIN users u ON l.user_id = u.id
                 WHERE u.department = ?
                 AND l.status = 'Approved'
                 AND ? BETWEEN DATE(l.from_date) AND DATE(l.to_date)

                 UNION

                 SELECT u.id, u.name, u.employee_id, u.role
                 FROM tl_leave_requests tl
                 JOIN users u ON tl.tl_user_id = u.id
                 WHERE u.department = ?
                 AND tl.status = 'Approved'
                 AND ? BETWEEN DATE(tl.from_date) AND DATE(tl.to_date)

                 ORDER BY name ASC`,
                [dept, date, dept, date]
            );

            res.json({ employees: employees || [] });

        } catch (error) {
            console.error("Error fetching team leave:", error);
            res.status(500).json({ error: "Failed to fetch leave data" });
        }
    }

    // ✅ ASSIGN EMPLOYEE TO PROJECT
    async assignEmployeeToProject(req, res) {
        try {
            const { projectId } = req.params;
            const { employee_id } = req.body;

            const [rows] = await db.execute(
                "SELECT employeeIds FROM projects WHERE id = ?",
                [projectId]
            );

            let existing = rows[0]?.employeeIds || "";
            let empList = existing ? existing.split(",") : [];

            if (!empList.includes(String(employee_id))) {
                empList.push(String(employee_id));
            }

            await db.execute(
                "UPDATE projects SET employeeIds = ? WHERE id = ?",
                [empList.join(","), projectId]
            );

            res.json({ success: true, message: "Employee assigned to project ✅" });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to assign employee" });
        }
    }

    // ✅ REMOVE EMPLOYEE FROM PROJECT
    async removeEmployeeFromProject(req, res) {
        try {
            const { projectId } = req.params;
            const { employee_id } = req.body;

            const [rows] = await db.execute(
                "SELECT employeeIds FROM projects WHERE id = ?",
                [projectId]
            );

            let existing = rows[0]?.employeeIds || "";
            let empList = existing
                ? existing.split(",").filter(id => id !== String(employee_id))
                : [];

            await db.execute(
                "UPDATE projects SET employeeIds = ? WHERE id = ?",
                [empList.join(","), projectId]
            );

            res.json({ success: true, message: "Employee removed from project ❌" });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to remove employee" });
        }
    }

    // ✅ APPROVE TEAM LEAD TIMESHEET (FOR MANAGER)
    async approveTeamLeadTimesheet(req, res) {
        try {
            const { timesheetId } = req.params;
            const { status } = req.body;

            await db.execute(
                'UPDATE timesheets SET status = ? WHERE id = ?',
                [status, timesheetId]
            );

            res.json({ success: true, message: "Timesheet approved ✅" });
        } catch (error) {
            res.status(500).json({ error: "Failed to approve timesheet" });
        }
    }

    // ✅ GET MY PENDING TIMESHEETS
    async getMyPendingTimesheets(req, res) {
        try {
            const { tlId } = req.params;

            const [rows] = await db.execute(
                `SELECT * FROM timesheets 
                 WHERE user_id = ? AND status = 'Pending'
                 ORDER BY task_date DESC`,
                [tlId]
            );

            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch timesheets" });
        }
    }

    // Fix #7 — TL submits resignation
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

    // Fix #7 — TL views their offer letters
    async getMyOffers(req, res) {
        try {
            const { tlId } = req.query;
            const [userRows] = await db.execute('SELECT name FROM users WHERE id = ?', [tlId]);
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
    // 🆕 TL WFH REQUEST WORKFLOW
    // NOTE: WFH is stored in tl_wfh_requests (separate table).
    //       getDashboardStats intentionally does NOT query this table
    //       so WFH days never appear in the "On Leave" count.
    // ══════════════════════════════════════════════

    // ✅ APPLY WFH
    async applyWFH(req, res) {
        try {
            const { tl_user_id, from_date, to_date, days, reason } = req.body;

            if (!tl_user_id || !from_date || !to_date || !reason) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            const fromDay = new Date(from_date).getDay();
            const toDay   = new Date(to_date).getDay();
            if (fromDay === 0 || fromDay === 6) return res.status(400).json({ error: "Cannot apply WFH starting on a weekend" });
            if (toDay   === 0 || toDay   === 6) return res.status(400).json({ error: "Cannot apply WFH ending on a weekend"   });

            const calculatedDays = this.calculateWorkingDays(from_date, to_date);
            if (calculatedDays === 0) return res.status(400).json({ error: "No working days in selected range" });

            const [userRows] = await db.execute('SELECT department FROM users WHERE id = ?', [tl_user_id]);
            if (!userRows.length) return res.status(404).json({ error: "Team Leader not found" });
            const department = userRows[0].department;

            const [mgrRows] = await db.execute(
                'SELECT id FROM users WHERE department = ? AND role = "Manager" LIMIT 1',
                [department]
            );
            if (!mgrRows.length) return res.status(400).json({ error: "No manager assigned to this department" });
            const manager_id = mgrRows[0].id;

            await db.execute(
                `INSERT INTO tl_wfh_requests 
                 (tl_user_id, department, from_date, to_date, days, reason, manager_id, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
                [tl_user_id, department, from_date, to_date, calculatedDays, reason, manager_id]
            );

            res.json({ success: true, message: `✅ WFH request submitted (${calculatedDays} days)` });
        } catch (error) {
            console.error("❌ Apply WFH Error:", error);
            res.status(500).json({ error: "Failed to apply WFH", details: error.message });
        }
    }

    // ✅ GET MY WFH REQUESTS
    async getMyWFHRequests(req, res) {
        try {
            const { tlId } = req.params;
            if (!tlId) return res.status(400).json({ error: "Team Leader ID is required" });

            const [rows] = await db.execute(
                `SELECT * FROM tl_wfh_requests WHERE tl_user_id = ? ORDER BY created_at DESC`,
                [tlId]
            );
            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch WFH requests" });
        }
    }

    // ✅ DELETE WFH REQUEST
    async deleteWFHRequest(req, res) {
        try {
            const { wfhId } = req.params;
            const [rows] = await db.execute('SELECT status FROM tl_wfh_requests WHERE id = ?', [wfhId]);
            if (!rows.length) return res.status(404).json({ error: "WFH request not found" });
            if (rows[0].status !== "Pending") return res.status(400).json({ error: "Can only delete pending requests" });

            await db.execute('DELETE FROM tl_wfh_requests WHERE id = ?', [wfhId]);
            res.json({ success: true, message: "✅ WFH request cancelled" });
        } catch (error) {
            res.status(500).json({ error: "Failed to delete WFH request" });
        }
    }
}

module.exports = new TeamLeaderController();