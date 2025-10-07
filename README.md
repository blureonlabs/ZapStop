# Zap Stop - Rental Car Management PWA

A Progressive Web App for managing rental cars, drivers, and earnings built with Next.js 14, Supabase, and TailwindCSS.

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
- **Backend**: Supabase (Auth, DB, File Storage)
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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**⚠️ Important**: Never commit your `.env.local` file to version control!

### 3. Database Setup

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `supabase-schema.sql` to create all tables and sample data

### 4. Create User Accounts

You'll need to create user accounts through Supabase Auth:

1. Go to Authentication > Users in your Supabase dashboard
2. Create users with appropriate roles
3. Update the user records in the `users` table to match the IDs from Supabase Auth

### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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