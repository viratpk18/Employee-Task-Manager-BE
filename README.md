# Employee Task Manager - Backend

Backend API for the Employee Task Manager application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

4. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login
- GET /api/auth/me - Get current user
- PUT /api/auth/updatepassword - Update password

### Employees
- GET /api/employees - Get all employees
- GET /api/employees/:id - Get employee by ID
- POST /api/employees - Create employee (Admin)
- PUT /api/employees/:id - Update employee (Admin)
- DELETE /api/employees/:id - Delete employee (Admin)
- GET /api/employees/stats/overview - Get statistics (Admin)

### Tasks
- GET /api/tasks - Get all tasks
- GET /api/tasks/:id - Get task by ID
- POST /api/tasks - Create task (Admin)
- PUT /api/tasks/:id - Update task
- DELETE /api/tasks/:id - Delete task (Admin)
- POST /api/tasks/:id/comments - Add comment
- GET /api/tasks/stats/overview - Get statistics
- GET /api/tasks/calendar/view - Get calendar tasks

## Database Models

### User
- name, email, password, role, department, joinDate, isActive

### Employee
- user (ref), employeeId, position, phone, address, skills, performance

### Task
- title, description, assignedTo, assignedBy, priority, status, deadline, comments

## Scripts

- `npm start` - Start development server with nodemon
- `npm run dev` - Start production server
