#!/bin/bash

# ZapStop Deployment Script
# This script helps prepare the application for deployment

echo "🚀 ZapStop Deployment Preparation"
echo "================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing frontend dependencies..."
npm install

echo "🔧 Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful!"
else
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "🐍 Installing backend dependencies..."
cd backend
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Backend dependencies installed successfully!"
else
    echo "❌ Backend dependency installation failed!"
    exit 1
fi

cd ..

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Deploy backend to Render (see DEPLOYMENT_GUIDE.md)"
echo "3. Deploy frontend to Netlify (see DEPLOYMENT_GUIDE.md)"
echo "4. Update environment variables as needed"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"