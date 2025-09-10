# ZapStop Backend API

Python FastAPI backend for the ZapStop rental car management system.

## Features

- **Authentication**: JWT-based authentication with refresh tokens
- **User Management**: Multi-role system (Admin, Accountant, Driver, Owner)
- **Car Management**: Vehicle tracking and assignment
- **Financial Analytics**: Earnings, expenses, and P&L analysis
- **Attendance Tracking**: Driver work sessions
- **Leave Management**: Request and approval system
- **Real-time Analytics**: Dashboard data with caching

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Caching**: Redis
- **Authentication**: JWT with bcrypt password hashing
- **Data Processing**: Pandas for analytics
- **Background Tasks**: Celery

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL
- Redis

### Installation

1. **Clone and navigate to backend directory**
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

5. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb zapstop
   
   # Run migrations (when available)
   alembic upgrade head
   ```

6. **Run the application**
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Environment Variables

See `env.example` for all required environment variables.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── config.py            # Configuration
│   ├── database.py          # Database setup
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── api/                 # API routes
│   ├── services/            # Business logic
│   ├── middleware/          # Custom middleware
│   └── utils/               # Utility functions
├── alembic/                 # Database migrations
├── tests/                   # Test files
├── requirements.txt         # Python dependencies
├── Dockerfile              # Docker configuration
└── README.md               # This file
```

## Development

### Running Tests

```bash
pytest
```

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head
```

### Code Formatting

```bash
# Format code
black app/

# Sort imports
isort app/
```

## Deployment

### Docker

```bash
# Build image
docker build -t zapstop-backend .

# Run container
docker run -p 8000:8000 zapstop-backend
```

### Production

1. Set `ENVIRONMENT=production` in environment variables
2. Use production database and Redis instances
3. Configure proper CORS origins
4. Set secure JWT secrets
5. Use reverse proxy (nginx) for SSL termination

## API Endpoints

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
- `POST /api/cars/{id}/assign-driver` - Assign driver (Admin)

### Analytics
- `GET /api/analytics/dashboard` - Dashboard data
- `GET /api/analytics/earnings` - Earnings analytics
- `GET /api/analytics/expenses` - Expenses analytics
- `GET /api/analytics/profit-loss` - P&L analytics

### Earnings
- `GET /api/earnings` - Get earnings
- `POST /api/earnings` - Create earnings
- `PUT /api/earnings/{id}` - Update earnings
- `DELETE /api/earnings/{id}` - Delete earnings (Admin)

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is proprietary software for ZapStop rental car management.
