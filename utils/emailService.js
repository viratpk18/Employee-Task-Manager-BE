const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send task notification email
exports.sendTaskNotification = async (to, taskDetails) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email service not configured. Skipping notification.');
      return;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: `New Task Assigned: ${taskDetails.taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">New Task Assigned</h2>
          <p>You have been assigned a new task by ${taskDetails.assignedBy}.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #555; margin-top: 0;">${taskDetails.taskTitle}</h3>
            <p><strong>Priority:</strong> <span style="text-transform: uppercase; color: ${getPriorityColor(taskDetails.priority)};">${taskDetails.priority}</span></p>
            <p><strong>Deadline:</strong> ${new Date(taskDetails.deadline).toLocaleDateString()}</p>
          </div>
          
          <p>Please log in to your account to view task details and start working on it.</p>
          
          <a href="${process.env.CLIENT_URL}/login" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
            View Task
          </a>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Task notification sent to ${to}`);
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

// Send task status update notification
exports.sendTaskUpdateNotification = async (to, taskDetails) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email service not configured. Skipping notification.');
      return;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: `Task Updated: ${taskDetails.taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">Task Status Updated</h2>
          <p>A task has been updated.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #555; margin-top: 0;">${taskDetails.taskTitle}</h3>
            <p><strong>New Status:</strong> <span style="text-transform: uppercase;">${taskDetails.status}</span></p>
            <p><strong>Updated By:</strong> ${taskDetails.updatedBy}</p>
          </div>
          
          <a href="${process.env.CLIENT_URL}/login" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
            View Task
          </a>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Task update notification sent to ${to}`);
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

// Helper function to get priority color
function getPriorityColor(priority) {
  const colors = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#FF5722',
    urgent: '#F44336'
  };
  return colors[priority] || '#666';
}
