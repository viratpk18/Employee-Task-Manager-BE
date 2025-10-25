const Task = require('../models/Task');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { sendTaskNotification } = require('../utils/emailService');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getAllTasks = async (req, res) => {
  try {
    const { status, priority, assignedTo, search, page = 1, limit = 10 } = req.query;

    // Build query based on user role
    let query = {};

    // If employee, show only their tasks
    if (req.user.role === 'employee') {
      query.assignedTo = req.user.id;
    }

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo && req.user.role === 'admin') query.assignedTo = assignedTo;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks'
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name email')
      .populate('comments.user', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if employee is authorized to view this task
    if (req.user.role === 'employee' && task.assignedTo._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this task'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task'
    });
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private/Admin
exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, deadline, tags } = req.body;

    // Verify assigned user exists and is an employee
    const assignedUser = await User.findById(assignedTo);

    if (!assignedUser || assignedUser.role !== 'employee') {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID'
      });
    }

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: req.user.id,
      priority,
      deadline,
      tags
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name email');

    // Send notification (async, don't wait)
    sendTaskNotification(assignedUser.email, {
      taskTitle: title,
      assignedBy: req.user.name,
      deadline,
      priority
    }).catch(err => console.error('Email notification error:', err));

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populatedTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating task'
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Employees can only update status of their own tasks
    if (req.user.role === 'employee') {
      if (task.assignedTo.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this task'
        });
      }

      // Only allow status update for employees
      const { status } = req.body;
      task = await Task.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      ).populate('assignedTo', 'name email department')
       .populate('assignedBy', 'name email');

      // Update employee's completed tasks count
      if (status === 'completed') {
        await Employee.findOneAndUpdate(
          { user: req.user.id },
          { $inc: { tasksCompleted: 1 } }
        );
      }
    } else {
      // Admin can update all fields
      task = await Task.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('assignedTo', 'name email department')
       .populate('assignedBy', 'name email');
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task'
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task'
    });
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    task.comments.push({
      user: req.user.id,
      text
    });

    await task.save();

    const updatedTask = await Task.findById(req.params.id)
      .populate('comments.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: updatedTask
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment'
    });
  }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats/overview
// @access  Private
exports.getTaskStats = async (req, res) => {
  try {
    let query = {};

    // If employee, show only their stats
    if (req.user.role === 'employee') {
      query.assignedTo = req.user.id;
    }

    const totalTasks = await Task.countDocuments(query);
    const completedTasks = await Task.countDocuments({ ...query, status: 'completed' });
    const pendingTasks = await Task.countDocuments({ ...query, status: 'pending' });
    const inProgressTasks = await Task.countDocuments({ ...query, status: 'in-progress' });

    // Get overdue tasks
    const overdueTasks = await Task.countDocuments({
      ...query,
      status: { $ne: 'completed' },
      deadline: { $lt: new Date() }
    });

    // Priority distribution
    const priorityStats = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Tasks by status over time (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const taskTrends = await Task.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0,
        priorityStats,
        taskTrends
      }
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task statistics'
    });
  }
};

// @desc    Get tasks for calendar view
// @route   GET /api/tasks/calendar/view
// @access  Private
exports.getCalendarTasks = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {
      deadline: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    // If employee, show only their tasks
    if (req.user.role === 'employee') {
      query.assignedTo = req.user.id;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .select('title status priority deadline assignedTo');

    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get calendar tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar tasks'
    });
  }
};
