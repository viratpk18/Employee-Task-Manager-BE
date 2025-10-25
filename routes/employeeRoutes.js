const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// Stats route (must be before /:id route)
router.get('/stats/overview', authorize('admin'), getEmployeeStats);

// CRUD routes
router
  .route('/')
  .get(authorize('admin'), getAllEmployees)
  .post(authorize('admin'), createEmployee);

router
  .route('/:id')
  .get(getEmployee)
  .put(authorize('admin'), updateEmployee)
  .delete(authorize('admin'), deleteEmployee);

module.exports = router;
