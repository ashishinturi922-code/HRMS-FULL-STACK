const db = require('../db');

class ManagerController {

    // 1. GET DASHBOARD STATS (UPDATED - Include Team Leaders AND Managers)
    async getDashboardStats(req, res) {
        try {
            const { managerId } = req.params;
            if (!managerId) return res.status(400).json({ error: "Manager ID is required" });

            const [userRows] = await db.execute(
                'SELECT department, employee_id FROM users WHERE id = ?', 
                [managerId]
            );
            
            if (userRows.length === 0) return res.status(404).json({ error: "Manager not found" });
            const mgrDept = userRows[0].department;
            const managerEmployeeId = userRows[0].employee_id;

            const [totalEmpRows] = await db.execute(
                `SELECT COUNT(*) as total FROM users 
                 WHERE role = 'Employee' 
                    OR UPPER(TRIM(REPLACE(role, ' ', ''))) = 'TEAMLEADER'
                    OR UPPER(TRIM(role)) = 'TEAM LEADER'
                    OR role = 'TeamLeader'
                    OR role = 'Team Leader'
                    OR role = 'Manager'`
            );
            const totalEmployees = totalEmpRows[0]?.total || 0;

            const [deptEmpRows] = await db.execute(
                `SELECT COUNT(*) as total FROM users 
                 WHERE department = ? 
                 AND (role = 'Employee' 
                      OR UPPER(TRIM(REPLACE(role, ' ', ''))) = 'TEAMLEADER'
                      OR UPPER(TRIM(role)) = 'TEAM LEADER'
                      OR role = 'TeamLeader'
                      OR role = 'Team Leader'
                      OR role = 'Manager')`, 
                [mgrDept]
            );
            const totalDeptEmployees = deptEmpRows[0]?.total || 0;

            let leaveCount = 0;
            try {
                const [leaveRows] = await db.execute(
                    `SELECT COUNT(DISTINCT lr.user_id) as count 
                     FROM leave_requests lr
                     JOIN users u ON lr.user_id = u.id
                     WHERE u.department = ? 
                     AND (u.role = 'Employee'
                          OR UPPER(TRIM(REPLACE(u.role, ' ', ''))) = 'TEAMLEADER'
                          OR UPPER(TRIM(u.role)) = 'TEAM LEADER'
                          OR u.role = 'TeamLeader'
                          OR u.role = 'Team Leader'
                          OR u.role = 'Manager')
                     AND lr.status = 'Approved'
                     AND CURRENT_DATE BETWEEN lr.from_date AND lr.to_date`,
                    [mgrDept]
                );
                leaveCount = leaveRows[0]?.count || 0;
            } catch (err) {
                console.error("Leave count error:", err);
                leaveCount = 0;
            }

            const presentPeople = totalDeptEmployees - leaveCount;
            const finalPresent = presentPeople < 0 ? 0 : presentPeople;

            let activeProjects = 0;
            let completedProjects = 0;
            try {
                const [projects] = await db.execute(
                    `SELECT id, status FROM projects WHERE managerId = ?`,
                    [managerEmployeeId]
                );
                
                console.log("Manager Employee ID:", managerEmployeeId);
                console.log("Projects found:", projects);
                
                activeProjects = projects.filter(p => p.status === 'Ongoing' || p.status === 'Active').length;
                completedProjects = projects.filter(p => p.status === 'Completed').length;
            } catch (err) {
                console.error("Projects error:", err);
                activeProjects = 0;
                completedProjects = 0;
            }

            res.json({
                department: mgrDept,
                totalEmployees: totalEmployees,
                presentEmployees: finalPresent,
                onLeave: leaveCount,
                activeProjects: activeProjects,
                completedProjects: completedProjects,
                pendingTimesheets: 0,
                attendanceStats: [
                    { name: "Present", value: finalPresent },
                    { name: "On Leave", value: leaveCount }
                ]
            });
        } catch (error) {
            console.error("Dashboard Stats Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    // 2. GET TEAM LEADERS
    async getTeamLeaders(req, res) {
        try {
            const [rows] = await db.execute(
                `SELECT id, name, employee_id, phone, official_email, department, role, username
                 FROM users 
                 WHERE UPPER(TRIM(REPLACE(role, ' ', ''))) = 'TEAMLEADER'
                    OR UPPER(TRIM(role)) = 'TEAM LEADER'
                    OR role = 'TeamLeader'
                    OR role = 'Team Leader'
                 ORDER BY name ASC`
            );
            console.log("Team Leaders fetched:", rows);
            res.json(rows || []);
        } catch (error) {
            console.error("Get Team Leaders Error:", error);
            res.status(500).json({ error: "Failed to fetch team leaders" });
        }
    }

    async getAllEmployees(req, res) {
        try {
            const [rows] = await db.execute(
                `SELECT id, name, employee_id, phone, official_email, department, role, username
                 FROM users 
                 WHERE role = 'Employee'
                 ORDER BY name ASC`
            );
            console.log("Employees fetched:", rows);
            res.json(rows || []);
        } catch (error) {
            console.error("Get All Employees Error:", error);
            res.status(500).json({ error: "Failed to fetch employees" });
        }
    }

    async getEmployeesByDepartment(req, res) {
        try {
            const { managerId } = req.params;
            
            const [mgrRows] = await db.execute(
                'SELECT department FROM users WHERE id = ?', 
                [managerId]
            );
            
            if (!mgrRows.length) return res.status(404).json({ error: "Manager not found" });
            const department = mgrRows[0].department;

            const [rows] = await db.execute(
                `SELECT id, name, employee_id, phone, official_email, department, role, username
                 FROM users 
                 WHERE department = ? AND role = 'Employee'
                 ORDER BY name ASC`,
                [department]
            );
            console.log("Department employees fetched:", rows);
            res.json(rows || []);
        } catch (error) {
            console.error("Get Department Employees Error:", error);
            res.status(500).json({ error: "Failed to fetch department employees" });
        }
    }

    async getTeamMembers(req, res) {
        try {
            const { managerId } = req.params;
            const [mgrRows] = await db.execute(
                'SELECT department FROM users WHERE id = ?', 
                [managerId]
            );
            if (!mgrRows.length) return res.status(404).json({ error: "Manager not found" });
            const dept = mgrRows[0]?.department;
            const [rows] = await db.execute(
                `SELECT id, name, employee_id, role, phone, official_email, department, username 
                 FROM users 
                 WHERE department = ? 
                 AND (role = 'Employee' 
                      OR UPPER(TRIM(REPLACE(role, ' ', ''))) = 'TEAMLEADER'
                      OR UPPER(TRIM(role)) = 'TEAM LEADER'
                      OR role = 'TeamLeader'
                      OR role = 'Team Leader')
                 ORDER BY name ASC`,
                [dept]
            );
            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch team members" });
        }
    }

    async getAllTeamMembers(req, res) {
        try {
            const [rows] = await db.execute(
                `SELECT id, name, employee_id, phone, official_email, department, role, username
                 FROM users 
                 WHERE role = 'Employee'
                    OR UPPER(TRIM(REPLACE(role, ' ', ''))) = 'TEAMLEADER'
                    OR UPPER(TRIM(role)) = 'TEAM LEADER'
                    OR role = 'TeamLeader'
                    OR role = 'Team Leader'
                    OR role = 'Manager'
                 ORDER BY 
                    CASE 
                        WHEN role = 'Manager' THEN 0
                        WHEN role IN ('Team Leader', 'TeamLeader', 'TEAM LEADER') THEN 1
                        WHEN role = 'Employee' THEN 2
                        ELSE 3
                    END ASC,
                    department ASC, 
                    name ASC`
            );
            console.log("All team members fetched:", rows);
            console.log("Total records:", rows.length);
            res.json(rows || []);
        } catch (error) {
            console.error("Get All Team Members Error:", error);
            res.status(500).json({ error: "Failed to fetch team members" });
        }
    }

    async getManagerProjects(req, res) {
        try {
            const { managerId } = req.params;
            const [mgrRows] = await db.execute(
                'SELECT name, employee_id FROM users WHERE id = ?', 
                [managerId]
            );
            if (!mgrRows.length) return res.status(404).json({ error: "Manager not found" });

            const managerName = mgrRows[0].name;
            const managerEmployeeId = mgrRows[0].employee_id;

            const [rows] = await db.execute(
                `SELECT * FROM projects 
                 WHERE managerId = ?
                 ORDER BY id DESC`,
                [managerEmployeeId]
            );

            console.log("Fetching projects for employee_id:", managerEmployeeId);
            console.log("Projects:", rows);

            const formatted = rows.map(p => ({
                id: p.id,
                projectName: p.name || p.projectName,
                description: p.description || p.projectDescription || "",
                status: p.status || "Ongoing",
                managerId: p.managerId,
                teamLeaderId: p.teamLeaderId || p.team_leader_id || null,
                employeeIds: p.employeeIds ? p.employeeIds.split(",").map(id => id.trim()) : []
            }));
            res.json(formatted);
        } catch (error) {
            console.error("Get Manager Projects Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    // ✅ NEW: ASSIGN EMPLOYEES TO PROJECT
    async assignEmployeesToProject(req, res) {
        try {
            const { projectId } = req.params;
            const { employeeIds } = req.body;

            console.log("📌 Assigning employees to project:", projectId);
            console.log("📌 Employee IDs:", employeeIds);

            if (!projectId) {
                return res.status(400).json({ error: "Project ID is required" });
            }

            if (!Array.isArray(employeeIds)) {
                return res.status(400).json({ error: "employeeIds must be an array" });
            }

            // Convert array to comma-separated string
            const employeeIdsString = employeeIds.length > 0 ? employeeIds.join(",") : "";

            await db.execute(
                'UPDATE projects SET employeeIds = ? WHERE id = ?',
                [employeeIdsString, projectId]
            );

            console.log("✅ Employees assigned successfully");

            res.json({ 
                success: true, 
                message: "Employees assigned to project successfully ✅",
                assignedEmployees: employeeIds
            });
        } catch (error) {
            console.error("❌ Error assigning employees:", error.message);
            res.status(500).json({ 
                error: "Failed to assign employees", 
                details: error.message 
            });
        }
    }

    // ✅ NEW: GET EMPLOYEES ASSIGNED TO A PROJECT
    async getProjectEmployees(req, res) {
        try {
            const { projectId } = req.params;

            if (!projectId) {
                return res.status(400).json({ error: "Project ID is required" });
            }

            const [projectRows] = await db.execute(
                'SELECT employeeIds FROM projects WHERE id = ?',
                [projectId]
            );

            if (!projectRows.length) {
                return res.status(404).json({ error: "Project not found" });
            }

            const employeeIdsString = projectRows[0].employeeIds || "";
            const employeeIds = employeeIdsString ? employeeIdsString.split(",").map(id => id.trim()) : [];

            console.log("✅ Project employees fetched for project:", projectId);
            console.log("Employee IDs:", employeeIds);

            res.json({ 
                projectId: projectId,
                employeeIds: employeeIds,
                totalAssigned: employeeIds.length
            });
        } catch (error) {
            console.error("❌ Error fetching project employees:", error.message);
            res.status(500).json({ 
                error: "Failed to fetch project employees", 
                details: error.message 
            });
        }
    }

    async getMyLeaves(req, res) {
        try {
            const { id } = req.params;
            const [rows] = await db.execute(
                'SELECT * FROM leave_requests WHERE user_id = ? ORDER BY from_date DESC',
                [id]
            );
            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch leaves" });
        }
    }

	async applyLeave(req, res) {
	    try {
	        const { user_id, leave_type, from_date, to_date, reason, session, days } = req.body;
	        
	        if (!user_id || !from_date || !to_date) {
	            return res.status(400).json({ error: "Required fields are missing: user_id, dates" });
	        }

	        // ✅ USE DAYS FROM FRONTEND OR FALLBACK TO CALCULATION
	        let finalDays = days;

	        if (!finalDays) {
	            // Only calculate if not provided by frontend
	            const start = new Date(from_date);
	            const end = new Date(to_date);
	            
	            let count = 0;
	            let current = new Date(start);

	            while (current <= end) {
	                const day = current.getDay();
	                if (day !== 0 && day !== 6) count++; // 0=Sun, 6=Sat
	                current.setDate(current.getDate() + 1);
	            }

	            finalDays = count > 0 ? count : 1;
	        }

	        // Half day is always 0.5
	        if (leave_type === "Half Day Leave") {
	            finalDays = 0.5;
	        }

	        console.log("✅ Leave Data:", {
	            user_id,
	            leave_type,
	            from_date,
	            to_date,
	            days: finalDays,
	            session
	        });

	        const sql = `INSERT INTO leave_requests (user_id, leave_type, from_date, to_date, reason, days, session, status) 
	                     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`;
	        
	        await db.execute(sql, [
	            user_id, 
	            leave_type || 'Casual Leave', 
	            from_date, 
	            to_date, 
	            reason || '', 
	            finalDays,  // ✅ USE CALCULATED OR PROVIDED DAYS
	            session || null
	        ]);

	        res.json({ 
	            success: true, 
	            message: "Leave applied successfully ✅",
	            daysApplied: finalDays 
	        });

	    } catch (error) {
	        console.error("DATABASE ERROR ON APPLY LEAVE:", error.sqlMessage || error.message);
	        res.status(500).json({ error: "Database error", details: error.message });
	    }
	}

    async getPendingApprovals(req, res) {
        try {
            const [rows] = await db.execute(`
                SELECT lr.*, u.name, u.role, u.employee_id
                FROM leave_requests lr
                JOIN users u ON lr.user_id = u.id
                WHERE (u.role = 'Employee' AND lr.days > 2 AND lr.status = 'TL Approved')
                OR ((UPPER(TRIM(REPLACE(u.role, ' ', ''))) = 'TEAMLEADER'
                     OR UPPER(TRIM(u.role)) = 'TEAM LEADER'
                     OR u.role = 'TeamLeader'
                     OR u.role = 'Team Leader') 
                    AND lr.status = 'Pending')
                ORDER BY lr.id DESC
            `);
            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch pending approvals" });
        }
    }

    async approveLeavRequest(req, res) {
        try {
            const { leaveId } = req.params;
            const { status, reason } = req.body;
            await db.execute('UPDATE leave_requests SET status = ?, reason = ? WHERE id = ?', [status, reason || null, leaveId]);
            res.json({ success: true, message: `Leave ${status}` });
        } catch (error) {
            res.status(500).json({ error: "Failed to update leave" });
        }
    }

    async approveLeaveRequest(req, res) {
        try {
            const { leaveId } = req.params;
            const { status, reason } = req.body;
            await db.execute('UPDATE leave_requests SET status = ? WHERE id = ?', [status, leaveId]);
            res.json({ success: true, message: `Leave ${status} successfully` });
        } catch (error) {
            res.status(500).json({ error: "Failed to update leave" });
        }
    }

    async getCalendarEvents(req, res) {
        try {
            const [rows] = await db.execute('SELECT * FROM calendar_events ORDER BY date_key ASC');
            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch calendar" });
        }
    }

    async updateProjectStatus(req, res) {
        try {
            const { projectId } = req.params;
            const { status } = req.body;
            await db.execute('UPDATE projects SET status = ? WHERE id = ?', [status, projectId]);
            res.json({ success: true, message: "Project status updated" });
        } catch (error) {
            res.status(500).json({ error: "Failed to update project status" });
        }
    }

    async assignTeamLeader(req, res) {
        try {
            const { projectId } = req.params;
            const { teamLeaderId } = req.body;
            await db.execute(
                'UPDATE projects SET teamLeaderId = ?, team_leader_id = ? WHERE id = ?',
                [teamLeaderId, teamLeaderId, projectId]
            );
            res.json({ success: true, message: "Team Leader assigned successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to assign team leader" });
        }
    }

    async getAllTimesheets(req, res) {
        try {
            const [rows] = await db.execute(
                `SELECT t.*, u.name, u.employee_id, u.role FROM timesheets t 
                 JOIN users u ON t.user_id = u.id ORDER BY t.task_date DESC`
            );
            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch timesheets" });
        }
    }

    async saveTimesheet(req, res) {
        try {
            const { id, user_id, project, task, hours, description, task_date } = req.body;
            if (id) {
                const sql = `UPDATE timesheets SET project=?, task=?, hours=?, description=?, task_date=? WHERE id=? AND status='Pending'`;
                await db.execute(sql, [project, task, hours, description, task_date, id]);
            } else {
                const sql = `INSERT INTO timesheets (user_id, project, task, hours, description, task_date, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')`;
                await db.execute(sql, [user_id, project, task, hours, description, task_date]);
            }
            res.json({ success: true, message: "Timesheet saved successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to save timesheet" });
        }
    }

    async updateTimesheetStatus(req, res) {
        try {
            const { timesheetId } = req.params;
            const { status } = req.body;
            await db.execute('UPDATE timesheets SET status = ? WHERE id = ?', [status, timesheetId]);
            res.json({ success: true, message: "Timesheet status updated" });
        } catch (error) {
            res.status(500).json({ error: "Failed to update timesheet" });
        }
    }

    // ✅ NEW: GET TEAM LEADS' PENDING TIMESHEETS FOR MANAGER TO APPROVE
    async getTeamLeadsPendingTimesheets(req, res) {
        try {
            const { managerId } = req.params;

            if (!managerId || managerId === 'undefined') {
                return res.status(400).json({ error: "Manager ID is required" });
            }

            const [mgrRows] = await db.execute(
                'SELECT employee_id, department FROM users WHERE id = ?',
                [managerId]
            );

            if (!mgrRows.length) {
                return res.status(404).json({ error: "Manager not found" });
            }

            const managerEmployeeId = mgrRows[0].employee_id;
            const managerDept = mgrRows[0].department;

            // Get ALL team leads in manager's department
            const [teamLeads] = await db.execute(
                `SELECT id FROM users 
                 WHERE department = ? 
                 AND (UPPER(TRIM(REPLACE(role, ' ', ''))) = 'TEAMLEADER'
                      OR UPPER(TRIM(role)) = 'TEAM LEADER'
                      OR role = 'TeamLeader'
                      OR role = 'Team Leader')`,
                [managerDept]
            );

            if (!teamLeads.length) {
                console.log("No team leads found in department:", managerDept);
                return res.json([]);
            }

            const teamLeadIds = teamLeads.map(tl => tl.id);
            console.log("Team Lead IDs:", teamLeadIds);

            // Get pending timesheets from these team leads
            const placeholders = teamLeadIds.map(() => '?').join(',');
            const [rows] = await db.execute(
                `SELECT t.*, u.name as submittedBy, u.employee_id, u.id as user_id, u.role
                 FROM timesheets t
                 JOIN users u ON t.user_id = u.id
                 WHERE t.user_id IN (${placeholders}) 
                 AND t.status = 'Pending'
                 ORDER BY t.task_date DESC, t.id DESC`,
                teamLeadIds
            );

            console.log("✅ Team leads' pending timesheets fetched for manager:", managerId);
            console.log("Total timesheets:", rows.length);

            res.json(rows || []);

        } catch (error) {
            console.error("❌ Error fetching team leads' pending timesheets:", error.message);
            res.status(500).json({ 
                error: "Failed to fetch timesheets", 
                details: error.message 
            });
        }
    }

    // ✅ NEW: MANAGER APPROVES TEAM LEAD'S TIMESHEET
    async approveTeamLeadTimesheet(req, res) {
        try {
            const { timesheetId } = req.params;
            const { status, comments } = req.body;

            if (!timesheetId) {
                return res.status(400).json({ error: "Timesheet ID is required" });
            }

            if (!status || !['Approved', 'Rejected'].includes(status)) {
                return res.status(400).json({ error: "Status must be 'Approved' or 'Rejected'" });
            }

            await db.execute(
                `UPDATE timesheets SET status = ? WHERE id = ?`,
                [status, timesheetId]
            );

            res.json({ 
                success: true, 
                message: `Timesheet ${status} successfully ✅`,
                status: status
            });

        } catch (error) {
            console.error("Error approving timesheet:", error.message);
            res.status(500).json({ 
                error: "Failed to approve timesheet", 
                details: error.message 
            });
        }
    }

    async getTeamLeaderLeaveRequests(req, res) {
        try {
            const { managerId } = req.params;
            const [mgrRows] = await db.execute(
                'SELECT department FROM users WHERE id = ?', 
                [managerId]
            );
            if (!mgrRows.length) return res.status(404).json({ error: "Manager not found" });
            const department = mgrRows[0].department;

            const [rows] = await db.execute(
                `SELECT tl.*, u.name as tl_name, u.employee_id FROM tl_leave_requests tl
                 JOIN users u ON tl.tl_user_id = u.id WHERE tl.department = ? AND tl.status = 'Pending'
                 ORDER BY tl.id DESC`, [department]
            );
            res.json(rows || []);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch leave requests" });
        }
    }

    async approveTLLeaveRequest(req, res) {
        try {
            const { leaveId } = req.params;
            const { status, manager_reason } = req.body;
            await db.execute(
                `UPDATE tl_leave_requests SET status = ?, manager_reason = ? WHERE id = ?`,
                [status, manager_reason || null, leaveId]
            );
            res.json({ success: true, message: `Leave request ${status}` });
        } catch (error) {
            res.status(500).json({ error: "Failed to update leave request" });
        }
    }

    async getProfile(req, res) {
        try {
            const { id } = req.params;
            const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: "Profile not found" });
            const user = rows[0];
            res.json({ 
                ...user, 
                personalEmail: user.personal_email, 
                officialEmail: user.official_email, 
                photo: user.profile_photo 
            });
        } catch (error) {
            res.status(500).json({ error: "Database error" });
        }
    }

    async updateProfile(req, res) {
        try {
            const { userId, name, phone, personalEmail, officialEmail, address, gender, dob, altPhone, bloodGroup, photo } = req.body;
            const sql = `UPDATE users SET name=?, phone=?, personal_email=?, official_email=?, address=?, gender=?, dob=?, alt_phone=?, blood_group=?, profile_photo=? WHERE id=?`;
            await db.execute(sql, [name, phone, personalEmail, officialEmail, address, gender, dob || null, altPhone, bloodGroup, photo, userId]);
            res.json({ success: true, message: "Profile updated successfully" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updatePassword(req, res) {
        try {
            const { userId, newPassword } = req.body;
            await db.execute('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);
            res.json({ success: true, message: "Password updated successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to update password" });
        }
    }

    async getLeaveEmployeesToday(req, res) {
        try {
            const { date, managerId } = req.query;
            
            if (!date) {
                return res.status(400).json({ error: "Date parameter is required" });
            }

            if (!managerId) {
                return res.status(400).json({ error: "Manager ID is required" });
            }

            const [mgrRows] = await db.execute(
                'SELECT department FROM users WHERE id = ?',
                [managerId]
            );

            if (mgrRows.length === 0) {
                return res.status(404).json({ error: "Manager not found" });
            }

            const department = mgrRows[0].department;

            const sql = `
                SELECT 
                    u.id, 
                    u.name, 
                    u.employee_id,
                    u.department,
                    u.role,
                    l.reason as leaveReason,
                    l.status
                FROM leave_requests l
                JOIN users u ON l.user_id = u.id
                WHERE u.department = ?
                AND (u.role = 'Employee'
                     OR UPPER(TRIM(REPLACE(u.role, ' ', ''))) = 'TEAMLEADER'
                     OR UPPER(TRIM(u.role)) = 'TEAM LEADER'
                     OR u.role = 'TeamLeader'
                     OR u.role = 'Team Leader'
                     OR u.role = 'Manager')
                AND l.status = 'Approved' 
                AND ? BETWEEN DATE(l.from_date) AND DATE(l.to_date)
                ORDER BY u.name ASC
            `;
            
            const [rows] = await db.execute(sql, [department, date]);
            
            console.log("Manager leave employees, team leaders, and managers fetched:", rows);
            
            res.json({ 
                employees: Array.isArray(rows) ? rows : []
            });
        } catch (error) {
            console.error("Get Leave Employees Error:", error);
            res.status(500).json({ error: "Failed to fetch leave employees", employees: [] });
        }
    }
}

module.exports = new ManagerController();