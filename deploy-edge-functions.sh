#!/bin/bash

# Deploy Edge Functions to Supabase
# Make sure you're logged in to Supabase CLI: supabase login

echo "🚀 Deploying Edge Functions to Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Please login to Supabase CLI first:"
    echo "supabase login"
    exit 1
fi

echo "📦 Deploying Analytics Functions..."
supabase functions deploy calculate-dashboard-stats --project-ref $(supabase status | grep "API URL" | cut -d'/' -f3 | cut -d'.' -f1)

echo "👥 Deploying User Management Functions..."
supabase functions deploy create-driver --project-ref $(supabase status | grep "API URL" | cut -d'/' -f3 | cut -d'.' -f1)

echo "⚡ Deploying Real-time Functions..."
supabase functions deploy process-attendance --project-ref $(supabase status | grep "API URL" | cut -d'/' -f3 | cut -d'.' -f1)

echo "📊 Deploying Data Processing Functions..."
supabase functions deploy export-financial-data --project-ref $(supabase status | grep "API URL" | cut -d'/' -f3 | cut -d'.' -f1)

echo "📧 Deploying Webhook Functions..."
supabase functions deploy email-notifications --project-ref $(supabase status | grep "API URL" | cut -d'/' -f3 | cut -d'.' -f1)

echo "✅ All Edge Functions deployed successfully!"
echo ""
echo "🔗 Function URLs:"
echo "- Analytics: https://$(supabase status | grep "API URL" | cut -d'/' -f3)/functions/v1/calculate-dashboard-stats"
echo "- User Management: https://$(supabase status | grep "API URL" | cut -d'/' -f3)/functions/v1/create-driver"
echo "- Real-time: https://$(supabase status | grep "API URL" | cut -d'/' -f3)/functions/v1/process-attendance"
echo "- Data Export: https://$(supabase status | grep "API URL" | cut -d'/' -f3)/functions/v1/export-financial-data"
echo "- Email Notifications: https://$(supabase status | grep "API URL" | cut -d'/' -f3)/functions/v1/email-notifications"
echo ""
echo "📝 Don't forget to update your frontend to use these Edge Functions!"
