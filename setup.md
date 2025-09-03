# Zap Stop Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   The `.env.local` file is already configured with your Supabase credentials.

3. **Database Setup**
   - Go to your Supabase dashboard: https://supabase.com/dashboard
   - Navigate to your project: https://hawlxjipneluhzcxzpps.supabase.co
   - Go to SQL Editor
   - Copy and paste the contents of `supabase-schema.sql`
   - Run the SQL script

4. **Create User Accounts**
   - Go to Authentication > Users in your Supabase dashboard
   - Create these users manually:
     - `admin@zapstop.com` (set password: `admin123`)
     - `accountant@zapstop.com` (set password: `accountant123`)
     - `driver1@zapstop.com` (set password: `driver123`)
     - `driver2@zapstop.com` (set password: `driver123`)
     - `driver3@zapstop.com` (set password: `driver123`)

5. **Update User Records**
   - After creating users in Supabase Auth, note their UUIDs
   - Go to Table Editor > users
   - Update the user records to match the UUIDs from Supabase Auth
   - Or run this SQL to update them:
   ```sql
   -- Replace the UUIDs with actual ones from Supabase Auth
   UPDATE users SET id = 'actual-uuid-from-auth' WHERE email = 'admin@zapstop.com';
   UPDATE users SET id = 'actual-uuid-from-auth' WHERE email = 'accountant@zapstop.com';
   UPDATE users SET id = 'actual-uuid-from-auth' WHERE email = 'driver1@zapstop.com';
   UPDATE users SET id = 'actual-uuid-from-auth' WHERE email = 'driver2@zapstop.com';
   UPDATE users SET id = 'actual-uuid-from-auth' WHERE email = 'driver3@zapstop.com';
   ```

6. **Run the Application**
   ```bash
   npm run dev
   ```

7. **Access the App**
   - Open http://localhost:3000
   - Login with any of the demo accounts

## Demo Accounts

- **Admin**: `admin@zapstop.com` / `admin123`
- **Accountant**: `accountant@zapstop.com` / `accountant123`
- **Driver**: `driver1@zapstop.com` / `driver123`

## Features

### Admin Dashboard
- View company-wide P&L
- Manage drivers and cars
- Advanced analytics with charts
- Real-time KPI monitoring

### Accountant Dashboard
- Approve/reject driver expenses
- View financial reports
- Driver performance analytics
- Expense management

### Driver Dashboard
- Log daily earnings (Uber, Bolt, Individual)
- Submit expense requests
- Track attendance
- View personal P&L

## PWA Features

- ✅ Offline caching
- ✅ Installable app
- ✅ Mobile-optimized
- ✅ Service worker
- ✅ Push notifications ready

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy!

### Manual
```bash
npm run build
npm start
```

## Troubleshooting

1. **Build Errors**: Make sure all dependencies are installed
2. **Database Errors**: Verify Supabase connection and run the schema
3. **Auth Errors**: Ensure users are created in Supabase Auth
4. **PWA Issues**: Check service worker registration in browser dev tools

## Support

For issues or questions, check the README.md file or create an issue in the repository.
