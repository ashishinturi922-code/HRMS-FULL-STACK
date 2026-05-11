const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./db');
const bcrypt = require('bcrypt');

// --- CONTROLLERS ---
const AdminController = require('./controllers/AdminController');
const ManagerController = require('./controllers/ManagerController');
const TeamLeaderController = require('./controllers/TeamLeaderController');
const EmployeeController = require('./controllers/EmployeeController');

const app = express();

// ✅ CORS: Allow frontend on port 3000 and Production
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://127.0.0.1:3000',
        'https://hrapta.com',
        'https://www.hrapta.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Handle preflight OPTIONS requests
app.options('*', cors());

// ✅ Body parsers — MUST be before routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- DIRECTORY SETUP ---
const uploadDirs = ['uploads/profiles', 'uploads/documents'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const subFolder = file.fieldname === 'photo' ? 'profiles' : 'documents';
        cb(null, `uploads/${subFolder}/`);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- BASE ROUTE ---
app.get('/', (req, res) => {
    res.json({ message: 'Addition Backend API is running. Use /api/health for status.' });
});

// --- HEALTH CHECK ---
app.get('/api/health', async (req, res) => {
    console.log('✅ Health check called');
    try {
        await db.execute('SELECT 1');
        res.json({
            status: 'Server is running ✅',
            database: 'Connected ✅',
            timestamp: new Date().toISOString(),
            port: 5000
        });
    } catch (err) {
        res.status(500).json({
            status: 'Server is running ✅',
            database: `❌ DB Error: ${err.message}`,
            timestamp: new Date().toISOString(),
        });
    }
});

// --- LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`🔐 Login attempt for user: ${username}`);

    // ✅ Validate input
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        // ✅ Check DB is available
        if (!db) {
            console.error('❌ Database not connected');
            return res.status(500).json({ success: false, message: 'Database connection error' });
        }

        const [rows] = await db.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            console.log(`❌ User not found: ${username}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = rows[0];

        // ✅ Compare password with bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log(`❌ Incorrect password for: ${username}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        console.log(`✅ Login successful for: ${username} | Role: ${user.role}`);
        return res.json({
            success: true,
            user: {
                id:          user.id,
                username:    user.username,
                email:       user.email,
                role:        user.role,
                department:  user.department,
                name:        user.name,
                // ✅ FIX: Include employee_id (e.g. "ACS1001") so the
                //         Timesheets page can display it in the Employee ID field.
                employee_id: user.employee_id
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error. Check console for details.' });
    }
});

// --- TEMPORARY: Fix/hash a user password (DELETE BEFORE PRODUCTION) ---
app.get('/api/fix-password/:username/:pass', async (req, res) => {
    try {
        const hashed = await bcrypt.hash(req.params.pass, 10);
        const [result] = await db.execute(
            'UPDATE users SET password = ? WHERE username = ?',
            [hashed, req.params.username]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send(`❌ User '${req.params.username}' not found`);
        }
        res.send(`✅ Password updated for '${req.params.username}'. Delete this route before going to production!`);
    } catch (err) {
        res.status(500).send(`❌ Error: ${err.message}`);
    }
});

// --- ADMIN ROUTES ---
app.get('/api/admin/stats', (req, res) => AdminController.getDashboardStats(req, res));
app.get('/api/employees', (req, res) => AdminController.getAllEmployees(req, res));
app.get('/api/departments', (req, res) => AdminController.getDepartments(req, res));
app.get('/api/projects', (req, res) => AdminController.getAllProjects(req, res));
app.get('/api/managers', (req, res) => AdminController.getManagers(req, res));
app.get('/api/admin/all-leaves', (req, res) => AdminController.getAllLeaveRequests(req, res));
app.get('/api/calendar/events', (req, res) => AdminController.getCalendarEvents(req, res));
app.get('/api/admin/leave-today', (req, res) => AdminController.getLeaveEmployeesToday(req, res));
app.get('/api/admin/timesheets', (req, res) => AdminController.getAllAdminTimesheets(req, res));
app.get('/api/admin/all-timesheets', (req, res) => AdminController.getAllAdminTimesheets(req, res));
app.put('/api/admin/timesheets/status/:id', (req, res) => AdminController.updateTimesheetStatus(req, res));
app.post('/api/users/create', (req, res) => AdminController.createUser(req, res));
app.delete('/api/users/:id', (req, res) => AdminController.deleteUser(req, res));
app.post('/api/departments/add', (req, res) => AdminController.addDepartment(req, res));
app.delete('/api/departments/:id', (req, res) => AdminController.deleteDepartment(req, res));
app.post('/api/projects/create', (req, res) => AdminController.createProject(req, res));
app.put('/api/projects/status/:id', (req, res) => AdminController.updateProjectStatus(req, res));
app.delete('/api/projects/:id', (req, res) => AdminController.deleteProject(req, res));
app.put('/api/admin/update-leave/:leaveId', (req, res) => AdminController.adminUpdateLeaveStatus(req, res));
app.post('/api/calendar/save', (req, res) => AdminController.saveCalendarEvent(req, res));
app.delete('/api/calendar/event/:id', (req, res) => AdminController.deleteCalendarEvent(req, res));

// --- MANAGER ROUTES ---
app.get('/api/manager/stats/:managerId', (req, res) => ManagerController.getDashboardStats(req, res));
app.get('/api/manager/team-leaders', (req, res) => ManagerController.getTeamLeaders(req, res));
app.get('/api/manager/all-employees', (req, res) => ManagerController.getAllEmployees(req, res));
app.get('/api/manager/department-employees/:managerId', (req, res) => ManagerController.getEmployeesByDepartment(req, res));
app.get('/api/manager/team/:managerId', (req, res) => ManagerController.getTeamMembers(req, res));
app.get('/api/manager/all-team', (req, res) => ManagerController.getAllTeamMembers(req, res));
app.get('/api/manager/projects/:managerId', (req, res) => ManagerController.getManagerProjects(req, res));
app.get('/api/manager/projects/:projectId/employees', (req, res) => ManagerController.getProjectEmployees(req, res));
app.put('/api/manager/projects/assign-employees/:projectId', (req, res) => ManagerController.assignEmployeesToProject(req, res));
app.put('/api/manager/projects/remove-employee/:projectId/:employeeId', (req, res) => ManagerController.removeEmployeeFromProject(req, res));
app.get('/api/manager/my-leaves/:id', (req, res) => ManagerController.getMyLeaves(req, res));
app.get('/api/manager/pending-approvals', (req, res) => ManagerController.getPendingApprovals(req, res));
app.post('/api/manager/apply-leave', (req, res) => ManagerController.applyLeave(req, res));
app.delete('/api/manager/delete-leave/:leaveId', (req, res) => ManagerController.deleteLeave(req, res));
app.put('/api/manager/update-leave/:leaveId', (req, res) => ManagerController.updateLeave(req, res));
app.get('/api/manager/calendar', (req, res) => ManagerController.getCalendarEvents(req, res));
app.get('/api/manager/profile/:id', (req, res) => AdminController.getProfile(req, res));
app.put('/api/manager/projects/status/:projectId', (req, res) => ManagerController.updateProjectStatus(req, res));
app.put('/api/manager/projects/assign-tl/:projectId', (req, res) => ManagerController.assignTeamLeader(req, res));
app.get('/api/manager/all-timesheets', (req, res) => ManagerController.getAllTimesheets(req, res));
app.post('/api/manager/save-timesheet', (req, res) => ManagerController.saveTimesheet(req, res));
app.put('/api/manager/timesheets/status/:timesheetId', (req, res) => ManagerController.updateTimesheetStatus(req, res));
app.get('/api/manager/team-leads-timesheets/:managerId', (req, res) => ManagerController.getTeamLeadsPendingTimesheets(req, res));
app.put('/api/manager/approve-timesheet/:timesheetId', (req, res) => ManagerController.approveTeamLeadTimesheet(req, res));
app.put('/api/manager/approve-leave/:leaveId', (req, res) => ManagerController.approveLeavRequest(req, res));
app.get('/api/tl-leave/requests/:managerId', (req, res) => ManagerController.getTeamLeaderLeaveRequests(req, res));
app.put('/api/tl-leave/approve/:leaveId', (req, res) => ManagerController.approveTLLeaveRequest(req, res));
// ✅ FIX: Register the manager leave-today route — was missing, causing the modal to always show empty
app.get('/api/manager/leave-today', (req, res) => ManagerController.getLeaveEmployeesToday(req, res));

// --- TEAM LEADER ROUTES ---
app.get('/api/teamleader/stats/:tlId', (req, res) => TeamLeaderController.getDashboardStats(req, res));
app.get('/api/teamleader/projects/:tlId', (req, res) => TeamLeaderController.getAssignedProjects(req, res));
app.put('/api/teamleader/assign-employee/:projectId', (req, res) => TeamLeaderController.assignEmployeeToProject(req, res));
app.put('/api/teamleader/remove-employee/:projectId', (req, res) => TeamLeaderController.removeEmployeeFromProject(req, res));
app.get('/api/teamleader/calendar-events', (req, res) => TeamLeaderController.getCalendarEvents(req, res));
app.get('/api/teamleader/my-team/:tlId', (req, res) => TeamLeaderController.getMyTeam(req, res));
app.get('/api/teamleader/leaves/pending/:tlId', (req, res) => TeamLeaderController.getTeamLeaveRequests(req, res));
app.put('/api/teamleader/leaves/approve/:leaveId', (req, res) => TeamLeaderController.approveLeave(req, res));
app.get('/api/teamleader/leave-today', (req, res) => TeamLeaderController.getTeamLeaveToday(req, res));
app.get('/api/teamleader/timesheets/pending/:tlId', (req, res) => TeamLeaderController.getPendingTimesheets(req, res));
app.get('/api/teamleader/my-pending-timesheets/:tlId', (req, res) => TeamLeaderController.getMyPendingTimesheets(req, res));
app.post('/api/teamleader/save-timesheet', (req, res) => TeamLeaderController.saveTimesheet(req, res));
app.put('/api/teamleader/timesheets/status/:timesheetId', (req, res) => TeamLeaderController.updateTimesheetStatus(req, res));
app.get('/api/teamleader/my-timesheets/:tlId', (req, res) => TeamLeaderController.getMyTimesheets(req, res));
app.get('/api/teamleader/profile/:id', (req, res) => TeamLeaderController.getProfile(req, res));
app.put('/api/teamleader/update-profile', (req, res) => TeamLeaderController.updateProfile(req, res));
app.put('/api/teamleader/update-password', (req, res) => TeamLeaderController.updatePassword(req, res));
app.post('/api/tl-leave/apply', (req, res) => TeamLeaderController.applyLeave(req, res));
app.get('/api/tl-leave/my-leaves/:tlId', (req, res) => TeamLeaderController.getMyLeaveRequests(req, res));
app.delete('/api/tl-leave/delete/:leaveId', (req, res) => TeamLeaderController.deleteLeaveRequest(req, res));
app.put('/api/tl-leave/approve/:leaveId', (req, res) => TeamLeaderController.approveOrDenyTLLeave(req, res));

// --- EMPLOYEE ROUTES ---
app.get('/api/employee/stats/:empId', (req, res) => EmployeeController.getDashboardStats(req, res));
app.get('/api/employee/profile/:empId', (req, res) => EmployeeController.getProfile(req, res));
app.post('/api/employee/update-profile', (req, res) => EmployeeController.updateProfile(req, res));
app.post('/api/employee/update-password', (req, res) => EmployeeController.updatePassword(req, res));
app.get('/api/employee/calendar', (req, res) => EmployeeController.getCalendarEvents(req, res));
app.get('/api/employee/projects/:empId', (req, res) => EmployeeController.getMyProjects(req, res));
app.get('/api/employee/leaves/:empId', (req, res) => EmployeeController.getMyLeaves(req, res));
app.post('/api/employee/apply-leave', (req, res) => EmployeeController.applyLeave(req, res));
app.delete('/api/employee/delete-leave/:leaveId', (req, res) => EmployeeController.deleteLeave(req, res));
app.get('/api/employee/my-timesheets/:empId', (req, res) => EmployeeController.getMyTimesheets(req, res));
app.post('/api/employee/save-timesheet', (req, res) => EmployeeController.saveTimesheet(req, res));
app.post('/api/employee/submit-timesheet', (req, res) => EmployeeController.submitTimesheet(req, res));
// ✅ FIX: Register the leave-today route — was missing, causing the modal to always show empty
app.get('/api/employee/leave-today', (req, res) => EmployeeController.getDepartmentLeaveToday(req, res));

// --- 404 HANDLER ---
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// --- SERVER STARTUP ---
// ✅ FIX: Removed 'localhost' hostname binding — was causing connection refusals
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🚀 API Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;