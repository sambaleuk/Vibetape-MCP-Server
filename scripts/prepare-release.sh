#!/bin/bash

# VibeTape MCP Server - Release Preparation Script
# This script prepares the repository for a GitHub release

set -e

echo "🎞️  Preparing VibeTape MCP Server for release..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Warning: Git working directory is not clean${NC}"
    echo "Please commit or stash your changes first."
    git status --short
    exit 1
fi

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Current version: ${VERSION}${NC}"

# Security check - ensure no sensitive files
echo -e "${BLUE}🔒 Running security checks...${NC}"

if [ -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file found! This contains sensitive data.${NC}"
    echo "Please remove .env file before release (it should be in .gitignore)"
    exit 1
fi

if find . -name "*.log" -o -name "state.json" -o -name "team_state.json" | grep -q .; then
    echo -e "${RED}❌ Error: Found log or state files that shouldn't be committed:${NC}"
    find . -name "*.log" -o -name "state.json" -o -name "team_state.json"
    exit 1
fi

# Check for API keys in code
if grep -r "sk-" src/ 2>/dev/null | grep -v "sk-..." | grep -v "example"; then
    echo -e "${RED}❌ Error: Potential API keys found in source code!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Security checks passed${NC}"

# Build the project
echo -e "${BLUE}🔨 Building project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# Test the server starts
echo -e "${BLUE}🧪 Testing server startup...${NC}"
timeout 5 node dist/server.js < /dev/null > /dev/null 2>&1 || true

if [ ! -f "dist/server.js" ]; then
    echo -e "${RED}❌ Built server not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Server startup test passed${NC}"

# Check README files exist
echo -e "${BLUE}📚 Checking documentation...${NC}"

if [ ! -f "README_EN.md" ]; then
    echo -e "${RED}❌ README_EN.md not found!${NC}"
    exit 1
fi

if [ ! -f "CHANGELOG.md" ]; then
    echo -e "${RED}❌ CHANGELOG.md not found!${NC}"
    exit 1
fi

if [ ! -f "SECURITY.md" ]; then
    echo -e "${RED}❌ SECURITY.md not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Documentation complete${NC}"

# Final file check
echo -e "${BLUE}📋 Final file inventory...${NC}"
echo "Required files:"
echo "  ✅ package.json"
echo "  ✅ tsconfig.json"  
echo "  ✅ .env.example"
echo "  ✅ README_EN.md"
echo "  ✅ CHANGELOG.md"
echo "  ✅ SECURITY.md"
echo "  ✅ CONTRIBUTING.md"
echo "  ✅ LICENSE"
echo "  ✅ .gitignore"
echo "  ✅ dist/server.js"

# Show what will be committed
echo -e "${BLUE}📦 Files to be included in release:${NC}"
git ls-files | head -20
if [ $(git ls-files | wc -l) -gt 20 ]; then
    echo "... and $(( $(git ls-files | wc -l) - 20 )) more files"
fi

echo ""
echo -e "${GREEN}🎉 Release preparation complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the changes: git status"
echo "2. Commit if needed: git add . && git commit -m 'feat: prepare v${VERSION} release'"
echo "3. Push to GitHub: git push origin main"
echo "4. Create a release on GitHub with tag v${VERSION}"
echo "5. Submit to MCP server registry"
echo ""
echo -e "${BLUE}🚀 Ready for takeoff!${NC}"
