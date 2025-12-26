#!/bin/bash

# Production Environment Variables Setup Script
# This script helps you set up environment variables for production

echo "🔐 LensTrack Production Environment Setup"
echo "=========================================="
echo ""

# Generate secrets
echo "📋 Generating secure secrets..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
STORAGE_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo ""
echo "✅ Secrets Generated!"
echo ""
echo "Copy these to your production deployment platform:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "NEXT_PUBLIC_STORAGE_SECRET=$STORAGE_SECRET"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Instructions:"
echo ""
echo "For Vercel:"
echo "  1. Go to Project Settings → Environment Variables"
echo "  2. Add both variables above"
echo "  3. Select 'Production' environment"
echo "  4. Redeploy"
echo ""
echo "For Railway:"
echo "  1. Go to Project → Variables"
echo "  2. Add both variables above"
echo "  3. Redeploy"
echo ""
echo "For other platforms, see PRODUCTION_ENV_SETUP.md"
echo ""
echo "⚠️  IMPORTANT: Never commit these secrets to Git!"
echo ""

