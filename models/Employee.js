const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeId: {
    type: String,
    unique: true
  },
  position: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  skills: [{
    type: String
  }],
  performance: {
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    reviews: [{
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: Number,
      comment: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  tasksCompleted: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate employee ID
employeeSchema.pre('save', async function(next) {
  if (!this.employeeId) {
    const count = await mongoose.model('Employee').countDocuments();
    this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
