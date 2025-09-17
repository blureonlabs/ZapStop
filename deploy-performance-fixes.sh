#!/bin/bash

# Deploy Performance Fixes to Render
# This script deploys the optimized backend to fix slow loading

set -e

echo "🚀 Deploying Performance Fixes to Render..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "performance-fixes" ]; then
    echo -e "${YELLOW}⚠️  Switching to performance-fixes branch...${NC}"
    git checkout performance-fixes
fi

echo -e "${YELLOW}📋 Current branch: $(git branch --show-current)${NC}"

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}📝 You have uncommitted changes. Committing them...${NC}"
    git add .
    git commit -m "Performance fixes: Optimize database queries and add health check"
fi

# Push to remote
echo -e "${YELLOW}📤 Pushing changes to remote...${NC}"
git push origin performance-fixes

echo -e "${GREEN}✅ Performance fixes deployed!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Apply database optimizations to your Neon database:"
echo "   cat backend/database_optimization.sql | psql YOUR_NEON_DATABASE_URL"
echo ""
echo "2. Your Render backend will automatically redeploy with the optimizations"
echo ""
echo "3. Test your dashboard - it should load much faster now!"
echo ""
echo "4. Check the health endpoint: https://your-render-app.onrender.com/health"
echo ""
echo -e "${GREEN}🎉 Performance improvements should be live in a few minutes!${NC}"
