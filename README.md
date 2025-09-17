# Zap Stop - Rental Car Management PWA

A Progressive Web App for managing rental cars, drivers, and earnings built with Next.js 14, AWS RDS PostgreSQL, and TailwindCSS.

## Features

### Role-Based Authentication
- **Admin**: Full control over drivers, cars, P&L, earnings, and expenses
- **Accountant**: View all financials, approve/reject expenses, manage P&L
- **Driver**: Limited dashboard to update earnings, expenses, start/end times, and request leave

### Key Features
- 📊 Real-time analytics with Recharts
- 📱 PWA ready (offline caching, installable)
- 🎨 Modern UI with shadcn/ui components
- 🔐 Role-based access control
- 📈 Comprehensive P&L tracking
- 💰 Multi-platform earnings tracking (Uber, Bolt, Individual)
- 📋 Expense management with approval workflow
- ⏰ Attendance tracking
- 📊 Advanced reporting and analytics

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TailwindCSS + shadcn/ui
- **Backend**: FastAPI + Python
- **Database**: AWS RDS PostgreSQL
- **Deployment**: Netlify (Frontend) + Render (Backend)
- **Charts**: Recharts
- **Icons**: Lucide React
- **PWA**: Service Worker + Manifest

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd zap-stop
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

### 3. Database Setup

1. Create an AWS RDS PostgreSQL database
2. Set up the database schema using the provided SQL files
3. Configure the `DATABASE_URL` in your backend environment

### 4. Backend Setup

1. Navigate to the `backend` directory
2. Install dependencies: `pip install -r requirements.txt`
3. Set up environment variables in `.env`
4. Run the backend: `uvicorn app.main:app --reload`

### 5. Create User Accounts

You can create user accounts through the backend API or admin interface.

### 6. Run the Application

```bash
# Frontend
npm run dev

# Backend (in separate terminal)
cd backend
uvicorn app.main:app --reload
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Accounts

The application comes with pre-configured demo accounts:

- **Admin**: `admin@zapstop.com` / `admin123`
- **Accountant**: `accountant@zapstop.com` / `accountant123`
- **Driver**: `driver1@zapstop.com` / `driver123`

## Database Schema

### Tables

1. **users** - User accounts with role-based access
2. **cars** - Vehicle information and assignments
3. **driver_earnings** - Daily earnings tracking
4. **driver_expenses** - Expense submissions and approvals
5. **attendance** - Driver attendance and time tracking

### Key Features

- Row Level Security (RLS) enabled
- Automatic timestamps
- Foreign key relationships
- Sample data included

## PWA Features

- ✅ Offline caching
- ✅ Installable app
- ✅ Service worker
- ✅ Manifest file
- ✅ Mobile-optimized UI
- ✅ Push notifications ready

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Dashboard pages
│   ├── login/            # Authentication
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── dashboard/        # Dashboard components
│   └── ui/              # shadcn/ui components
├── contexts/            # React contexts
├── lib/                 # Utilities and configurations
└── styles/              # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@zapstop.com or create an issue in the repository.