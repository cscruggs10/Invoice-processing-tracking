#!/bin/bash

echo "PostgreSQL Setup for Invoice Tracker"
echo "===================================="
echo ""

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    echo "✓ PostgreSQL is already installed"
else
    echo "✗ PostgreSQL is not installed"
    echo ""
    echo "Please install PostgreSQL first:"
    echo ""
    echo "macOS (with Homebrew):"
    echo "  brew install postgresql"
    echo "  brew services start postgresql"
    echo ""
    echo "Or download from: https://www.postgresql.org/download/"
    echo ""
    exit 1
fi

# Create database
echo ""
echo "Creating database 'invoice_tracker'..."
createdb invoice_tracker 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ Database 'invoice_tracker' created successfully"
else
    echo "! Database 'invoice_tracker' may already exist (this is OK)"
fi

echo ""
echo "Setup complete! Next steps:"
echo "1. Update the DATABASE_URL in .env file with your PostgreSQL credentials"
echo "2. Run: npm run db:push"
echo "3. Run: npm run dev"