# ZapStop Setup Guide

Complete setup guide for the ZapStop rental car management system with Python backend and Next.js frontend.

## 🏗️ Project Structure

```
ZapStop/
├── frontend/                 # Next.js frontend (existing)
├── backend/                  # Python FastAPI backend (new)
├── docker-compose.yml        # Docker configuration
├── start-dev.sh             # Linux/Mac startup script
├── start-dev.bat            # Windows startup script
└── SETUP_GUIDE.md           # This file
```

## 🚀 Quick Start

### Option 1: Using Docker (Recommended)

1. **Start all services**
   ```bash
   # Linux/Mac
   chmod +x start-dev.sh
   ./start-dev.sh
   
   # Windows
   start-dev.bat
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Option 2: Manual Setup

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Start PostgreSQL and Redis**
   ```bash
   # Using Docker
   docker-compose up -d db redis
   
   # Or install locally
   # PostgreSQL: https://www.postgresql.org/download/
   # Redis: https://redis.io/download
   ```

6. **Run the backend**
   ```bash
   python run.py
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local
   echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
   ```

4. **Run the frontend**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/zapstop

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# App
DEBUG=True
ENVIRONMENT=development
```

### Frontend Environment Variables

Create `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=ZapStop
```

## 🗄️ Database Setup

### Using Docker (Recommended)

The database will be automatically created when you run `docker-compose up`.

### Manual Setup

1. **Install PostgreSQL**
2. **Create database**
   ```sql
   CREATE DATABASE zapstop;
   CREATE USER zapstop_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE zapstop TO zapstop_user;
   ```

3. **Update DATABASE_URL in .env**
   ```env
   DATABASE_URL=postgresql://zapstop_user:your_password@localhost:5432/zapstop
   ```

## 🔐 Authentication

The backend uses JWT-based authentication. To get started:

1. **Create an admin user** (you'll need to do this manually in the database or through the API)
2. **Login** through the frontend or API
3. **Use the access token** for authenticated requests

### Creating Admin User

You can create an admin user by:

1. **Using the API directly**
   ```bash
   curl -X POST "http://localhost:8000/api/users" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@zapstop.com",
       "password": "admin123",
       "name": "Admin User",
       "role": "admin",
       "phone": "+971501234567"
     }'
   ```

2. **Or through the database** (if you have direct access)

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create user (Admin)
- `GET /api/users/{id}` - Get user by ID
- `PUT /api/users/{id}` - Update user (Admin)
- `DELETE /api/users/{id}` - Delete user (Admin)

### Cars
- `GET /api/cars` - Get all cars
- `POST /api/cars` - Create car (Admin)
- `GET /api/cars/{id}` - Get car by ID
- `PUT /api/cars/{id}` - Update car (Admin)
- `DELETE /api/cars/{id}` - Delete car (Admin)

### Analytics
- `GET /api/analytics/dashboard` - Dashboard data
- `GET /api/analytics/earnings` - Earnings analytics
- `GET /api/analytics/expenses` - Expenses analytics
- `GET /api/analytics/profit-loss` - P&L analytics

### Earnings
- `GET /api/earnings` - Get earnings
- `POST /api/earnings` - Create earnings
- `PUT /api/earnings/{id}` - Update earnings

### Expenses
- `GET /api/expenses` - Get expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/{id}` - Update expense
- `PUT /api/expenses/{id}/approve` - Approve expense
- `PUT /api/expenses/{id}/reject` - Reject expense

### Attendance
- `GET /api/attendance` - Get attendance
- `POST /api/attendance/start-work` - Start work
- `POST /api/attendance/end-work` - End work
- `GET /api/attendance/current-status` - Current status

### Leave Requests
- `GET /api/leave-requests` - Get leave requests
- `POST /api/leave-requests` - Create leave request
- `PUT /api/leave-requests/{id}` - Update leave request
- `PUT /api/leave-requests/{id}/approve` - Approve request (Admin)
- `PUT /api/leave-requests/{id}/reject` - Reject request (Admin)

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d db redis backend

# View logs
docker-compose logs backend
docker-compose logs frontend

# Stop all services
docker-compose down

# Rebuild services
docker-compose up --build
```

## 🔍 Troubleshooting

### Common Issues

1. **Backend won't start**
   - Check if PostgreSQL and Redis are running
   - Verify environment variables in `.env`
   - Check logs: `docker-compose logs backend`

2. **Frontend can't connect to backend**
   - Verify `NEXT_PUBLIC_API_URL` in `.env.local`
   - Check if backend is running on port 8000
   - Check CORS settings in backend

3. **Database connection issues**
   - Verify DATABASE_URL in backend `.env`
   - Check if PostgreSQL is running
   - Verify database exists

4. **Authentication issues**
   - Check JWT secrets in backend `.env`
   - Verify user exists in database
   - Check token expiration settings

### Logs

```bash
# Backend logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f db

# All logs
docker-compose logs -f
```

## 📚 Documentation

- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Backend README**: `backend/README.md`
- **Architecture Plan**: `ARCHITECTURAL_PLAN.md`
- **Migration Strategy**: `MIGRATION_STRATEGY.md`

## 🚀 Production Deployment

For production deployment:

1. **Set production environment variables**
2. **Use production database and Redis**
3. **Configure proper CORS origins**
4. **Set secure JWT secrets**
5. **Use reverse proxy (nginx) for SSL**
6. **Enable HTTPS**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section
2. Review the logs
3. Check the API documentation
4. Create an issue in the repository

---

**Happy coding! 🎉**
