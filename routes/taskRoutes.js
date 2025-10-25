const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  getTaskStats,
  getCalendarTasks
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// Stats and calendar routes (must be before /:id route)
router.get('/stats/overview', getTaskStats);
router.get('/calendar/view', getCalendarTasks);

// CRUD routes
router
  .route('/')
  .get(getAllTasks)
  .post(authorize('admin'), createTask);

router
  .route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(authorize('admin'), deleteTask);

// Comment route
router.post('/:id/comments', addComment);

module.exports = router;
