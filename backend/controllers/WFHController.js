const db = require('../db');

class WFHController {

    calculateWorkingDays(fromDate, toDate) {
        let count = 0;
        let current = new Date(fromDate);
        const end = new Date(toDate);
        while (current <= end) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    }

    validateDates(from_date, to_date) {
        const from = new Date(from_date);
        const to   = new Date(to_date);
        if (from > to)                                  return "From date cannot be after to date";
        if (from.getDay() === 0 || from.getDay() === 6) return "Cannot start WFH on a weekend";
        if (to.getDay()   === 0 || to.getDay()   === 6) return "Cannot end WFH on a weekend";
        return null;
    }

    // ══════════════════════════════════════════════
    //  ① EMPLOYEE WFH 
    // ══════════════════════════════════════════════

    async getMyWFH(req, res) {
        try {
            const { empId } = req.params;
            if (!empId) return res.status(400).json({ error: "Employee ID is required" });
            const [rows] = await db.execute(
                `SELECT * FROM wfh_requests WHERE user_id = ? ORDER BY from_date DESC`,
                [empId]
            );
            res.json(rows || []);
        } catch (err) {
            console.error("❌ getMyWFH:", err.message);
            res.status(500).json({ error: "Failed to fetch WFH requests" });
        }
    }

    async applyWFH(req, res) {
        try {
            const { user_id, from_date, to_date, reason } = req.body;

            if (!user_id || !from_date || !to_date || !reason)
                return res.status(400).json({ error: "Missing required fields: user_id, from_date, to_date, reason" });

            const dateErr = this.validateDates(from_date, to_date);
            if (dateErr) return res.status(400).json({ error: dateErr });

            const calculatedDays = this.calculateWorkingDays(from_date, to_date);
            if (calculatedDays === 0)
                return res.status(400).json({ error: "No working days in selected range" });

            const [existing] = await db.execute(
                `SELECT id FROM wfh_requests
                 WHERE user_id = ? AND status IN ('Pending','TL Approved','Approved')
                 AND from_date <= ? AND to_date >= ?`,
                [user_id, to_date, from_date]
            );
            if (existing.length > 0)
                return res.status(400).json({ error: "A WFH request already exists for this period" });

            await db.execute(
                `INSERT INTO wfh_requests (user_id, from_date, to_date, days, reason, status)
                 VALUES (?, ?, ?, ?, ?, 'Pending')`,
                [user_id, from_date, to_date, calculatedDays, reason]
            );

            res.json({
                success: true,
                message: `✅ WFH request submitted (${calculatedDays} day${calculatedDays !== 1 ? 's' : ''})`,
                daysApplied: calculatedDays
            });
        } catch (err) {
            console.error("❌ applyWFH:", err.message);
            res.status(500).json({ error: "Failed to apply WFH", details: err.message });
        }
    }

    async deleteWFH(req, res) {
        try {
            const { wfhId } = req.params;
            const [rows] = await db.execute(`SELECT status FROM wfh_requests WHERE id = ?`, [wfhId]);
            if (!rows.length) return res.status(404).json({ error: "WFH request not found" });

            if (!['Pending', 'TL Approved'].includes(rows[0].status))
                return res.status(400).json({ error: `Cannot cancel a WFH request with status: ${rows[0].status}` });

            await db.execute(`DELETE FROM wfh_requests WHERE id = ?`, [wfhId]);
            res.json({ success: true, message: "WFH request cancelled successfully" });
        } catch (err) {
            console.error("❌ deleteWFH:", err.message);
            res.status(500).json({ error: "Failed to cancel WFH request" });
        }
    }

    // ══════════════════════════════════════════════
    //  ② TEAM LEADER — own WFH
    // ══════════════════════════════════════════════

    async tlGetMyWFH(req, res) {
        try {
            const { tlId } = req.params;
            const [rows] = await db.execute(
                `SELECT * FROM tl_wfh_requests WHERE tl_user_id = ? ORDER BY created_at DESC`,
                [tlId]
            );
            res.json(rows || []);
        } catch (err) {
            console.error("❌ tlGetMyWFH:", err.message);
            res.status(500).json({ error: "Failed to fetch WFH requests" });
        }
    }

    async tlApplyWFH(req, res) {
        try {
            const { tl_user_id, from_date, to_date, reason } = req.body;

            if (!tl_user_id || !from_date || !to_date || !reason)
                return res.status(400).json({ error: "Missing required fields" });

            const dateErr = this.validateDates(from_date, to_date);
            if (dateErr) return res.status(400).json({ error: dateErr });

            const calculatedDays = this.calculateWorkingDays(from_date, to_date);
            if (calculatedDays === 0)
                return res.status(400).json({ error: "No working days in selected range" });

            const [existing] = await db.execute(
                `SELECT id FROM tl_wfh_requests
                 WHERE tl_user_id = ? AND status IN ('Pending','Approved')
                 AND from_date <= ? AND to_date >= ?`,
                [tl_user_id, to_date, from_date]
            );
            if (existing.length > 0)
                return res.status(400).json({ error: "A WFH request already exists for this period" });

            // ✅ FIX: Auto-fetch department & manager directly from DB so it never fails
            const [userRows] = await db.execute('SELECT department FROM users WHERE id = ?', [tl_user_id]);
            if (!userRows.length) return res.status(404).json({ error: "Team Leader not found" });
            const department = userRows[0].department;

            const [mgrRows] = await db.execute(
                'SELECT id FROM users WHERE department = ? AND role = "Manager" LIMIT 1',
                [department]
            );
            const manager_id = mgrRows.length ? mgrRows[0].id : null;

            await db.execute(
                `INSERT INTO tl_wfh_requests (tl_user_id, department, from_date, to_date, days, reason, manager_id, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
                [tl_user_id, department, from_date, to_date, calculatedDays, reason, manager_id]
            );

            res.status(201).json({
                success: true,
                message: `✅ WFH request submitted (${calculatedDays} day${calculatedDays !== 1 ? 's' : ''})`
            });
        } catch (err) {
            console.error("❌ tlApplyWFH:", err.message);
            res.status(500).json({ error: "Failed to apply WFH", details: err.message });
        }
    }

    async tlDeleteWFH(req, res) {
        try {
            const { wfhId } = req.params;
            const [rows] = await db.execute(`SELECT status FROM tl_wfh_requests WHERE id = ?`, [wfhId]);
            if (!rows.length) return res.status(404).json({ error: "WFH request not found" });

            if (rows[0].status !== 'Pending')
                return res.status(400).json({ error: `Cannot cancel a WFH request with status: ${rows[0].status}` });

            await db.execute(`DELETE FROM tl_wfh_requests WHERE id = ?`, [wfhId]);
            res.json({ success: true, message: "WFH request cancelled successfully" });
        } catch (err) {
            console.error("❌ tlDeleteWFH:", err.message);
            res.status(500).json({ error: "Failed to cancel WFH request" });
        }
    }

    // ══════════════════════════════════════════════
    //  ③ TEAM LEADER — approves EMPLOYEE WFH
    // ══════════════════════════════════════════════

    async tlGetPendingEmployeeWFH(req, res) {
        try {
            const { tlId } = req.params;
            
            const [userRows] = await db.execute('SELECT department FROM users WHERE id = ?', [tlId]);
            if (!userRows.length) return res.status(404).json({ error: "TL not found" });
            const department = userRows[0].department;

            const [rows] = await db.execute(
                `SELECT w.*, u.name AS employee_name, u.employee_id, u.department
                 FROM wfh_requests w
                 JOIN users u ON w.user_id = u.id
                 WHERE w.status = 'Pending'
                   AND u.department = ?
                   AND u.role = 'Employee'
                 ORDER BY w.from_date ASC`,
                [department]
            );
            res.json(rows || []);
        } catch (err) {
            console.error("❌ tlGetPendingEmployeeWFH:", err.message);
            res.status(500).json({ error: "Failed to fetch pending WFH requests" });
        }
    }

    async tlApproveEmployeeWFH(req, res) {
        try {
            const { wfhId } = req.params;
            const { status, tl_reason } = req.body; 

            if (!['Approved', 'Rejected', 'Denied'].includes(status))
                return res.status(400).json({ error: "status must be 'Approved' or 'Rejected'" });

            const [rows] = await db.execute(`SELECT status, days FROM wfh_requests WHERE id = ?`, [wfhId]);
            if (!rows.length) return res.status(404).json({ error: "WFH request not found" });
            if (rows[0].status !== 'Pending')
                return res.status(400).json({ error: `Request is already ${rows[0].status}` });

            let finalStatus = status;

            if (status === 'Approved') {
                const days = parseFloat(rows[0].days);
                if (days > 2) {
                    finalStatus = 'TL Approved'; 
                } else {
                    finalStatus = 'Approved'; 
                }
            } else {
                finalStatus = 'Denied';
            }

            await db.execute(
                `UPDATE wfh_requests SET status = ?, tl_reason = ?, updated_at = NOW() WHERE id = ?`,
                [finalStatus, tl_reason || null, wfhId]
            );
            res.json({ success: true, message: `Employee WFH request ${finalStatus}` });
        } catch (err) {
            console.error("❌ tlApproveEmployeeWFH:", err.message);
            res.status(500).json({ error: "Failed to update WFH status" });
        }
    }

    // ══════════════════════════════════════════════
    //  ④ MANAGER — own WFH 
    // ══════════════════════════════════════════════

    async managerGetMyWFH(req, res) {
        try {
            const { managerId } = req.params;
            const [rows] = await db.execute(
                `SELECT * FROM manager_wfh_requests WHERE user_id = ? ORDER BY created_at DESC`,
                [managerId]
            );
            res.json(rows || []);
        } catch (err) {
            console.error("❌ managerGetMyWFH:", err.message);
            res.status(500).json({ error: "Failed to fetch WFH requests" });
        }
    }

    async managerApplyWFH(req, res) {
        try {
            const { user_id, manager_id, from_date, to_date, reason } = req.body;
            const mgrId = manager_id || user_id;

            if (!mgrId || !from_date || !to_date || !reason)
                return res.status(400).json({ error: "Missing required fields" });

            const dateErr = this.validateDates(from_date, to_date);
            if (dateErr) return res.status(400).json({ error: dateErr });

            const calculatedDays = this.calculateWorkingDays(from_date, to_date);
            if (calculatedDays === 0)
                return res.status(400).json({ error: "No working days in selected range" });

            const [existing] = await db.execute(
                `SELECT id FROM manager_wfh_requests
                 WHERE user_id = ? AND status IN ('Pending','Approved')
                 AND from_date <= ? AND to_date >= ?`,
                [mgrId, to_date, from_date]
            );
            if (existing.length > 0)
                return res.status(400).json({ error: "A WFH request already exists for this period" });

            // ✅ FIX: Removed 'department' from the insert query. 
            // The manager_wfh_requests table doesn't expect it!
            await db.execute(
                `INSERT INTO manager_wfh_requests (user_id, from_date, to_date, days, reason, status)
                 VALUES (?, ?, ?, ?, ?, 'Pending')`,
                [mgrId, from_date, to_date, calculatedDays, reason]
            );

            res.status(201).json({
                success: true,
                message: `✅ WFH request submitted (${calculatedDays} day${calculatedDays !== 1 ? 's' : ''})`
            });
        } catch (err) {
            console.error("❌ managerApplyWFH:", err.message);
            res.status(500).json({ error: "Failed to apply WFH", details: err.message });
        }
    }

    async managerDeleteWFH(req, res) {
        try {
            const { wfhId } = req.params;
            const [rows] = await db.execute(`SELECT status FROM manager_wfh_requests WHERE id = ?`, [wfhId]);
            if (!rows.length) return res.status(404).json({ error: "WFH request not found" });

            if (rows[0].status !== 'Pending')
                return res.status(400).json({ error: `Cannot cancel a WFH request with status: ${rows[0].status}` });

            await db.execute(`DELETE FROM manager_wfh_requests WHERE id = ?`, [wfhId]);
            res.json({ success: true, message: "WFH request cancelled successfully" });
        } catch (err) {
            console.error("❌ managerDeleteWFH:", err.message);
            res.status(500).json({ error: "Failed to cancel WFH request" });
        }
    }

    // ══════════════════════════════════════════════
    //  ⑤ MANAGER — approves TL WFH
    // ══════════════════════════════════════════════

    async tlGetPendingForManager(req, res) {
        try {
            const { managerId } = req.params;

            const [userRows] = await db.execute('SELECT department FROM users WHERE id = ?', [managerId]);
            if (!userRows.length) return res.status(404).json({ error: "Manager not found" });
            const department = userRows[0].department;

            const [rows] = await db.execute(
                `SELECT w.*, u.name AS tl_name, u.employee_id, u.department
                 FROM tl_wfh_requests w
                 JOIN users u ON w.tl_user_id = u.id
                 WHERE w.status = 'Pending' 
                   AND u.department = ?
                 ORDER BY w.from_date ASC`,
                [department]
            );
            res.json(rows || []);
        } catch (err) {
            console.error("❌ tlGetPendingForManager:", err.message);
            res.status(500).json({ error: "Failed to fetch pending TL WFH requests" });
        }
    }

    async tlApproveWFH(req, res) {
        try {
            const { wfhId } = req.params;
            const { status, manager_reason } = req.body; 

            if (!['Approved', 'Denied'].includes(status))
                return res.status(400).json({ error: "status must be 'Approved' or 'Denied'" });

            const [rows] = await db.execute(`SELECT id FROM tl_wfh_requests WHERE id = ?`, [wfhId]);
            if (!rows.length) return res.status(404).json({ error: "WFH request not found" });

            await db.execute(
                `UPDATE tl_wfh_requests SET status = ?, manager_reason = ?, updated_at = NOW() WHERE id = ?`,
                [status, manager_reason || null, wfhId]
            );
            res.json({ success: true, message: `TL WFH request ${status.toLowerCase()} successfully` });
        } catch (err) {
            console.error("❌ tlApproveWFH:", err.message);
            res.status(500).json({ error: "Failed to update WFH status" });
        }
    }

    // ══════════════════════════════════════════════
    //  ⑥ MANAGER — final-approves EMPLOYEE WFH
    // ══════════════════════════════════════════════

    async managerGetPendingEmployeeWFH(req, res) {
        try {
            const { managerId } = req.params;

            const [userRows] = await db.execute('SELECT department FROM users WHERE id = ?', [managerId]);
            if (!userRows.length) return res.status(404).json({ error: "Manager not found" });
            const department = userRows[0].department;

            const [rows] = await db.execute(
                `SELECT w.*, u.name AS employee_name, u.employee_id, u.department
                 FROM wfh_requests w
                 JOIN users u ON w.user_id = u.id
                 WHERE w.status = 'TL Approved'
                   AND u.department = ?
                 ORDER BY w.from_date ASC`,
                [department]
            );
            res.json(rows || []);
        } catch (err) {
            console.error("❌ managerGetPendingEmployeeWFH:", err.message);
            res.status(500).json({ error: "Failed to fetch pending employee WFH requests" });
        }
    }

    async managerApproveEmployeeWFH(req, res) {
        try {
            const { wfhId } = req.params;
            const { status, manager_reason } = req.body; 

            if (!['Approved', 'Denied'].includes(status))
                return res.status(400).json({ error: "status must be 'Approved' or 'Denied'" });

            const [rows] = await db.execute(`SELECT status FROM wfh_requests WHERE id = ?`, [wfhId]);
            if (!rows.length) return res.status(404).json({ error: "WFH request not found" });
            if (rows[0].status !== 'TL Approved')
                return res.status(400).json({
                    error: `Can only approve requests with status 'TL Approved'. Current: ${rows[0].status}`
                });

            await db.execute(
                `UPDATE wfh_requests SET status = ?, manager_reason = ?, updated_at = NOW() WHERE id = ?`,
                [status, manager_reason || null, wfhId]
            );
            res.json({ success: true, message: `Employee WFH request ${status.toLowerCase()} successfully` });
        } catch (err) {
            console.error("❌ managerApproveEmployeeWFH:", err.message);
            res.status(500).json({ error: "Failed to update WFH status" });
        }
    }

    // ══════════════════════════════════════════════
    //  ⑦ ADMIN — approves MANAGER WFH
    // ══════════════════════════════════════════════

    async adminGetPendingManagerWFH(req, res) {
        try {
            const [rows] = await db.execute(
                `SELECT w.*, u.name AS manager_name, u.employee_id, u.department
                 FROM manager_wfh_requests w
                 JOIN users u ON w.user_id = u.id
                 WHERE w.status = 'Pending'
                 ORDER BY w.from_date ASC`
            );
            res.json(rows || []);
        } catch (err) {
            console.error("❌ adminGetPendingManagerWFH:", err.message);
            res.status(500).json({ error: "Failed to fetch pending Manager WFH requests" });
        }
    }

    async adminApproveManagerWFH(req, res) {
        try {
            const { wfhId } = req.params;
            const { status } = req.body; 

            if (!['Approved', 'Denied'].includes(status))
                return res.status(400).json({ error: "status must be 'Approved' or 'Denied'" });

            const [rows] = await db.execute(`SELECT id FROM manager_wfh_requests WHERE id = ?`, [wfhId]);
            if (!rows.length) return res.status(404).json({ error: "WFH request not found" });

            await db.execute(
                `UPDATE manager_wfh_requests SET status = ?, updated_at = NOW() WHERE id = ?`,
                [status, wfhId]
            );
            res.json({ success: true, message: `Manager WFH request ${status.toLowerCase()} successfully` });
        } catch (err) {
            console.error("❌ adminApproveManagerWFH:", err.message);
            res.status(500).json({ error: "Failed to update WFH status" });
        }
    }
}

module.exports = new WFHController();