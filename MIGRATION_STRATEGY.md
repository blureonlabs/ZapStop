# ZapStop Migration Strategy: Frontend + Python Backend

## Recommended Project Structure

```
ZapStop/
├── frontend/                 # Existing Next.js app (keep as-is)
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── lib/
│   ├── package.json
│   ├── next.config.ts
│   └── ... (all existing files)
├── backend/                  # New Python FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── api/
│   │   ├── services/
│   │   └── utils/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── alembic/
│   └── tests/
├── shared/                   # Shared types and utilities
│   ├── types/
│   │   ├── user.ts
│   │   ├── car.ts
│   │   └── earnings.ts
│   └── schemas/
│       ├── user.py
│       └── car.py
├── docker-compose.yml        # For local development
├── .env.example
└── README.md
```

## Migration Phases

### Phase 1: Backend Setup (Week 1-2)
1. **Create backend folder structure**
2. **Set up Python FastAPI project**
3. **Configure PostgreSQL database**
4. **Implement basic authentication**
5. **Create core API endpoints**

### Phase 2: Gradual API Migration (Week 3-5)
1. **Start with non-critical endpoints** (health, basic CRUD)
2. **Update frontend to use new API** for specific features
3. **Keep Supabase as fallback** during transition
4. **Test thoroughly** before removing old endpoints

### Phase 3: Complete Migration (Week 6-7)
1. **Migrate all remaining endpoints**
2. **Update all frontend components**
3. **Remove Supabase dependencies**
4. **Optimize performance**

### Phase 4: Production Deployment (Week 8)
1. **Deploy backend to production**
2. **Update frontend deployment**
3. **Monitor and optimize**
4. **Clean up old code**

## Frontend Changes Required

### 1. Update API Base URL
```typescript
// src/lib/api.ts (new file)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const apiClient = {
  get: (endpoint: string) => fetch(`${API_BASE_URL}${endpoint}`),
  post: (endpoint: string, data: any) => fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  // ... other methods
}
```

### 2. Update Authentication Context
```typescript
// src/contexts/AuthContext.tsx (modified)
import { apiClient } from '@/lib/api'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Replace Supabase auth with JWT auth
  const signIn = async (email: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', { email, password })
    const data = await response.json()
    
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
    }
    
    return { error: data.error }
  }
  
  // ... rest of the implementation
}
```

### 3. Update Data Fetching
```typescript
// src/lib/supabase.ts (replace with new API client)
import { apiClient } from './api'

export const fetchUsers = async () => {
  const response = await apiClient.get('/api/users')
  return response.json()
}

export const fetchCars = async () => {
  const response = await apiClient.get('/api/cars')
  return response.json()
}

// ... other functions
```

## Backend Implementation Plan

### 1. Core Backend Structure
```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, users, cars, analytics

app = FastAPI(title="ZapStop API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(cars.router, prefix="/api/cars", tags=["cars"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
```

### 2. Database Models (SQLAlchemy)
```python
# backend/app/models/user.py
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from enum import Enum as PyEnum

class UserRole(PyEnum):
    ADMIN = "admin"
    ACCOUNTANT = "accountant"
    DRIVER = "driver"
    OWNER = "owner"

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    phone = Column(String(20))
    assigned_car_id = Column(UUID(as_uuid=True), ForeignKey("cars.id"))
    documents = Column(JSONB)
    document_expiry_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assigned_car = relationship("Car", back_populates="assigned_driver")
    earnings = relationship("DriverEarning", back_populates="driver")
    expenses = relationship("DriverExpense", back_populates="driver")
    attendance = relationship("Attendance", back_populates="driver")
```

### 3. API Endpoints
```python
# backend/app/api/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate
from app.services.auth_service import get_current_user

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user has admin role
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Create user logic here
    db_user = User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
```

## Environment Configuration

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=ZapStop
```

### Backend (.env)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/zapstop
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

## Docker Configuration

### docker-compose.yml
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/zapstop
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=zapstop
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## Benefits of This Approach

1. **Minimal Disruption**: Keep existing frontend working
2. **Gradual Migration**: Move endpoints one by one
3. **Easy Rollback**: Can revert to Supabase if needed
4. **Independent Deployment**: Frontend and backend can be deployed separately
5. **Team Collaboration**: Different teams can work on different parts
6. **Technology Flexibility**: Can change backend technology later

## Next Steps

1. **Create backend folder** in your project
2. **Set up Python FastAPI project**
3. **Configure database and basic endpoints**
4. **Start migrating non-critical features first**
5. **Gradually replace Supabase calls with new API**

This approach ensures a smooth transition while maintaining your existing frontend functionality.
