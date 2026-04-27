const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');

// All these routes will automatically have /api/admin in front
router.get('/stats', (req, res) => AdminController.getDashboardStats(req, res));
router.get('/employees', (req, res) => AdminController.getAllEmployees(req, res));
router.get('/managers', (req, res) => AdminController.getManagers(req, res));
router.post('/users/create', (req, res) => AdminController.createUser(req, res));
router.get('/departments', (req, res) => AdminController.getDepartments(req, res));
router.post('/departments/add', (req, res) => AdminController.addDepartment(req, res));
router.delete('/departments/:id', (req, res) => AdminController.deleteDepartment(req, res));
router.get('/all-leaves', (req, res) => AdminController.getAllLeaveRequests(req, res));
router.put('/update-leave/:leaveId', (req, res) => AdminController.adminUpdateLeaveStatus(req, res));
router.get('/projects', (req, res) => AdminController.getAllProjects(req, res));
router.post('/projects/create', (req, res) => AdminController.createProject(req, res));
router.delete('/projects/:id', (req, res) => AdminController.deleteProject(req, res));
router.get('/profile/:id', (req, res) => AdminController.getProfile(req, res));
router.put('/profile/:id', (req, res) => AdminController.updateProfile(req, res));
router.post('/change-password', (req, res) => AdminController.updatePassword(req, res));
router.get('/calendar-events', (req, res) => AdminController.getCalendarEvents(req, res));
router.post('/calendar/save', (req, res) => AdminController.saveCalendarEvent(req, res));
router.delete('/calendar/event/:id', (req, res) => AdminController.deleteCalendarEvent(req, res));

module.exports = router;