# ZapStop API Swagger Documentation Guide

## 🎯 Accessing Swagger UI

### **Development Environment**
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### **Production Environment**
- **Swagger UI**: https://api.zapstop.com/docs
- **ReDoc**: https://api.zapstop.com/redoc

## 🔐 Authentication in Swagger

### **Step 1: Get Access Token**
1. Go to the **Authentication** section in Swagger UI
2. Click on **POST /api/auth/login**
3. Click **"Try it out"**
4. Enter your credentials:
   ```json
   {
     "username": "admin@zapstop.com",
     "password": "admin123"
   }
   ```
5. Click **"Execute"**
6. Copy the `access_token` from the response

### **Step 2: Authorize Requests**
1. Click the **"Authorize"** button at the top of Swagger UI
2. Enter: `Bearer YOUR_ACCESS_TOKEN`
3. Click **"Authorize"**
4. Now you can test all authenticated endpoints

## 📊 API Endpoints Overview

### **🔐 Authentication Endpoints**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/refresh` | Refresh token | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/logout` | User logout | Yes |

### **👥 User Management**
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/api/users` | Get all users | Yes | Admin |
| POST | `/api/users` | Create user | Yes | Admin |
| GET | `/api/users/{id}` | Get user by ID | Yes | Admin |
| PUT | `/api/users/{id}` | Update user | Yes | Admin |
| DELETE | `/api/users/{id}` | Delete user | Yes | Admin |

### **🚗 Car Management**
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/api/cars` | Get all cars | Yes | Any |
| POST | `/api/cars` | Create car | Yes | Admin |
| GET | `/api/cars/{id}` | Get car by ID | Yes | Any |
| PUT | `/api/cars/{id}` | Update car | Yes | Admin |
| DELETE | `/api/cars/{id}` | Delete car | Yes | Admin |
| POST | `/api/cars/{id}/assign-driver` | Assign driver | Yes | Admin |

### **📊 Analytics**
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/api/analytics/dashboard` | Dashboard data | Yes | Any |
| GET | `/api/analytics/earnings` | Earnings analytics | Yes | Any |
| GET | `/api/analytics/expenses` | Expenses analytics | Yes | Any |
| GET | `/api/analytics/profit-loss` | P&L analytics | Yes | Any |

### **💰 Earnings Management**
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/api/earnings` | Get earnings | Yes | Any |
| POST | `/api/earnings` | Create earnings | Yes | Driver/Admin |
| PUT | `/api/earnings/{id}` | Update earnings | Yes | Driver/Admin |
| DELETE | `/api/earnings/{id}` | Delete earnings | Yes | Admin |

### **💸 Expenses Management**
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/api/expenses` | Get expenses | Yes | Any |
| POST | `/api/expenses` | Create expense | Yes | Driver/Admin |
| PUT | `/api/expenses/{id}` | Update expense | Yes | Driver/Admin |
| PUT | `/api/expenses/{id}/approve` | Approve expense | Yes | Admin/Accountant |
| PUT | `/api/expenses/{id}/reject` | Reject expense | Yes | Admin/Accountant |

### **⏰ Attendance Management**
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/api/attendance` | Get attendance | Yes | Any |
| POST | `/api/attendance/start-work` | Start work | Yes | Driver |
| POST | `/api/attendance/end-work` | End work | Yes | Driver |
| GET | `/api/attendance/current-status` | Current status | Yes | Driver |

### **🏖️ Leave Management**
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/api/leave-requests` | Get leave requests | Yes | Any |
| POST | `/api/leave-requests` | Create leave request | Yes | Driver/Admin |
| PUT | `/api/leave-requests/{id}` | Update leave request | Yes | Driver/Admin |
| PUT | `/api/leave-requests/{id}/approve` | Approve request | Yes | Admin |
| PUT | `/api/leave-requests/{id}/reject` | Reject request | Yes | Admin |

## 🧪 Testing with Swagger UI

### **1. Test Authentication**
```bash
# 1. Go to POST /api/auth/login
# 2. Click "Try it out"
# 3. Enter credentials:
{
  "username": "admin@zapstop.com",
  "password": "admin123"
}
# 4. Click "Execute"
# 5. Copy the access_token
```

### **2. Test User Creation**
```bash
# 1. Authorize with the access token
# 2. Go to POST /api/users
# 3. Click "Try it out"
# 4. Enter user data:
{
  "email": "driver@zapstop.com",
  "password": "driver123",
  "name": "John Driver",
  "role": "driver",
  "phone": "+971501234567"
}
# 5. Click "Execute"
```

### **3. Test Car Creation**
```bash
# 1. Go to POST /api/cars
# 2. Click "Try it out"
# 3. Enter car data:
{
  "plate_number": "ABC-123",
  "model": "Toyota Camry 2023",
  "monthly_due": 7500.00
}
# 4. Click "Execute"
```

### **4. Test Analytics**
```bash
# 1. Go to GET /api/analytics/dashboard
# 2. Click "Try it out"
# 3. Set time_filter: "monthly"
# 4. Click "Execute"
```

## 📝 Request/Response Examples

### **Login Request**
```json
{
  "username": "admin@zapstop.com",
  "password": "admin123"
}
```

### **Login Response**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### **User Creation Request**
```json
{
  "email": "driver@zapstop.com",
  "password": "driver123",
  "name": "John Driver",
  "role": "driver",
  "phone": "+971501234567"
}
```

### **User Response**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "driver@zapstop.com",
  "name": "John Driver",
  "role": "driver",
  "phone": "+971501234567",
  "assigned_car_id": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### **Dashboard Analytics Response**
```json
{
  "total_earnings": 150000.00,
  "total_expenses": 25000.00,
  "net_profit": 125000.00,
  "platform_breakdown": {
    "uber": 80000.00,
    "bolt": 50000.00,
    "individual": 20000.00
  },
  "company_stats": {
    "total_cars": 10,
    "total_drivers": 8,
    "total_owners": 3
  },
  "daily_trends": [
    {
      "date": "2024-01-01",
      "earnings": 5000.00,
      "expenses": 800.00,
      "net": 4200.00
    }
  ],
  "car_performance": [
    {
      "car_id": "123e4567-e89b-12d3-a456-426614174000",
      "plate_number": "ABC-123",
      "model": "Toyota Camry 2023",
      "monthly_due": 7500.00,
      "earnings": 12000.00,
      "expenses": 2000.00,
      "net": 10000.00,
      "driver_name": "John Driver"
    }
  ]
}
```

## 🔧 Swagger UI Features

### **Interactive Testing**
- **Try it out**: Test any endpoint directly from the browser
- **Request/Response**: See exact request and response data
- **Error Handling**: View detailed error messages
- **Authentication**: Test with different user roles

### **Documentation**
- **Endpoint Descriptions**: Detailed descriptions for each endpoint
- **Parameter Documentation**: Information about all parameters
- **Response Schemas**: Complete response structure documentation
- **Example Values**: Sample request/response data

### **Code Generation**
- **cURL Commands**: Copy cURL commands for testing
- **JavaScript**: Generate JavaScript code for frontend integration
- **Python**: Generate Python code for backend integration
- **Multiple Languages**: Support for various programming languages

## 🚀 Quick Start with Swagger

1. **Start the backend**:
   ```bash
   cd backend
   python run.py
   ```

2. **Open Swagger UI**: http://localhost:8000/docs

3. **Login and get token**:
   - Go to `POST /api/auth/login`
   - Enter credentials and execute
   - Copy the access token

4. **Authorize requests**:
   - Click "Authorize" button
   - Enter `Bearer YOUR_ACCESS_TOKEN`
   - Click "Authorize"

5. **Test endpoints**:
   - Browse through different sections
   - Click "Try it out" on any endpoint
   - Fill in parameters and execute
   - View responses and test different scenarios

## 🎯 Tips for Using Swagger UI

1. **Always authorize first** before testing protected endpoints
2. **Check response codes** - 200 means success, 4xx/5xx means error
3. **Use the examples** provided in the documentation
4. **Test different user roles** to understand permissions
5. **Check the response schema** to understand data structure
6. **Use the search** to quickly find specific endpoints

---

**Happy API Testing! 🎉**
