const User = require('../models/User');
const Employee = require('../models/Employee');
const Task = require('../models/Task');

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private/Admin
exports.getAllEmployees = async (req, res) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;

    // Build query
    let query = { role: 'employee' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) {
      query.department = department;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const employees = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // Get employee details
    const employeesWithDetails = await Promise.all(
      employees.map(async (emp) => {
        const empDetails = await Employee.findOne({ user: emp._id });
        const taskCount = await Task.countDocuments({ assignedTo: emp._id });
        const completedTasks = await Task.countDocuments({ 
          assignedTo: emp._id, 
          status: 'completed' 
        });

        return {
          ...emp.toJSON(),
          employeeId: empDetails?.employeeId,
          position: empDetails?.position,
          taskCount,
          completedTasks
        };
      })
    );

    res.status(200).json({
      success: true,
      count: employeesWithDetails.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: employeesWithDetails
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees'
    });
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
exports.getEmployee = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const employee = await Employee.findOne({ user: user._id });
    const tasks = await Task.find({ assignedTo: user._id })
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        ...user.toJSON(),
        employeeDetails: employee,
        tasks
      }
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee'
    });
  }
};

// @desc    Create employee
// @route   POST /api/employees
// @access  Private/Admin
exports.createEmployee = async (req, res) => {
  try {
    const { name, email, password, department, position, phone, skills } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: 'employee',
      department
    });

    // Create employee record
    const employee = await Employee.create({
      user: user._id,
      position,
      phone,
      skills: skills || []
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        ...user.toJSON(),
        employeeId: employee.employeeId,
        position: employee.position
      }
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating employee'
    });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private/Admin
exports.updateEmployee = async (req, res) => {
  try {
    const { name, email, department, position, phone, skills, isActive } = req.body;

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Update user
    user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, department, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    // Update employee record
    await Employee.findOneAndUpdate(
      { user: req.params.id },
      { position, phone, skills },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employee'
    });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private/Admin
exports.deleteEmployee = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Delete employee record
    await Employee.findOneAndDelete({ user: req.params.id });

    // Delete user
    await User.findByIdAndDelete(req.params.id);

    // Optionally: Reassign or delete tasks
    await Task.updateMany(
      { assignedTo: req.params.id },
      { status: 'cancelled' }
    );

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting employee'
    });
  }
};

// @desc    Get employee statistics
// @route   GET /api/employees/stats/overview
// @access  Private/Admin
exports.getEmployeeStats = async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({ role: 'employee' });
    const activeEmployees = await User.countDocuments({ role: 'employee', isActive: true });
    
    // Get department distribution
    const departmentStats = await User.aggregate([
      { $match: { role: 'employee' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
        departmentStats
      }
    });
  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee statistics'
    });
  }
};
