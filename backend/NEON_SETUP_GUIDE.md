# Neon Database Setup Guide for ZapStop API

This guide will help you connect your ZapStop API backend to Neon PostgreSQL database and access the APIs through Swagger UI.

## Prerequisites

1. **Neon Account**: Sign up at [neon.tech](https://neon.tech)
2. **Python 3.8+**: Make sure you have Python installed
3. **Git**: For version control

## Step 1: Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Note down your connection string (it looks like):
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

## Step 2: Environment Configuration

1. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` file with your Neon credentials:
   ```env
   DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
   DEBUG=True
   ENVIRONMENT=development
   ```

## Step 3: Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Or using pipenv (recommended)
pipenv install
```

## Step 4: Run Database Migration

```bash
# Run the migration script to create tables
python migrate_to_neon.py
```

This will:
- Test the database connection
- Create all necessary tables
- Verify table creation

## Step 5: Start the API Server

```bash
# Start the server
python start_server.py

# Or directly with uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Step 6: Access Swagger UI

Once the server is running, you can access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Step 7: Test the API

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. API Health Check
```bash
curl http://localhost:8000/api/health
```

### 3. Test Authentication (via Swagger)
1. Go to http://localhost:8000/docs
2. Find the `/api/auth/login` endpoint
3. Click "Try it out"
4. Enter test credentials (you'll need to create a user first)
5. Click "Execute"

## Available API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - User login
- `POST /refresh` - Refresh access token
- `GET /me` - Get current user info
- `POST /logout` - User logout

### Users (`/api/users`)
- `GET /` - List all users
- `POST /` - Create new user
- `GET /{user_id}` - Get user by ID
- `PUT /{user_id}` - Update user
- `DELETE /{user_id}` - Delete user

### Cars (`/api/cars`)
- `GET /` - List all cars
- `POST /` - Add new car
- `GET /{car_id}` - Get car by ID
- `PUT /{car_id}` - Update car
- `DELETE /{car_id}` - Delete car

### Analytics (`/api/analytics`)
- `GET /dashboard` - Get dashboard data
- `GET /earnings` - Get earnings analytics
- `GET /expenses` - Get expenses analytics
- `GET /profit-loss` - Get P&L analysis

### Earnings (`/api/earnings`)
- `GET /` - List earnings
- `POST /` - Add earnings record
- `GET /{earning_id}` - Get earning by ID
- `PUT /{earning_id}` - Update earning
- `DELETE /{earning_id}` - Delete earning

### Expenses (`/api/expenses`)
- `GET /` - List expenses
- `POST /` - Add expense record
- `GET /{expense_id}` - Get expense by ID
- `PUT /{expense_id}` - Update expense
- `DELETE /{expense_id}` - Delete expense

### Attendance (`/api/attendance`)
- `GET /` - List attendance records
- `POST /` - Clock in/out
- `GET /{attendance_id}` - Get attendance by ID
- `PUT /{attendance_id}` - Update attendance

### Leave Requests (`/api/leave-requests`)
- `GET /` - List leave requests
- `POST /` - Create leave request
- `GET /{request_id}` - Get leave request by ID
- `PUT /{request_id}` - Update leave request
- `POST /{request_id}/approve` - Approve leave request
- `POST /{request_id}/reject` - Reject leave request

## Authentication in Swagger

1. Go to http://localhost:8000/docs
2. Click the "Authorize" button (lock icon)
3. Enter your JWT token in the format: `Bearer YOUR_ACCESS_TOKEN`
4. Click "Authorize"

## Troubleshooting

### Database Connection Issues
- Verify your Neon connection string
- Check if your IP is whitelisted in Neon
- Ensure SSL mode is set to "require"

### Import Errors
- Make sure you're in the backend directory
- Check if all dependencies are installed
- Verify Python path includes the app directory

### Port Already in Use
- Change the port in `start_server.py`
- Kill existing processes: `lsof -ti:8000 | xargs kill -9`

## Production Deployment

For production deployment:

1. Set `DEBUG=False` in environment
2. Use strong JWT secrets
3. Configure proper CORS origins
4. Set up SSL certificates
5. Use environment-specific database URLs
6. Configure proper logging

## Support

If you encounter issues:
1. Check the logs for error messages
2. Verify your Neon database connection
3. Ensure all environment variables are set
4. Check the API health endpoints

## Next Steps

1. Create your first user account
2. Test all API endpoints
3. Set up your frontend to consume the API
4. Configure monitoring and logging
5. Set up automated backups
