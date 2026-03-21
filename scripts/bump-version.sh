#!/bin/bash
# Bump the app version using npm version
# Usage: ./scripts/bump-version.sh [major|minor|patch]
#
# This script:
# 1. Bumps the version in package.json
# 2. Reminds you to update the changelog

set -e

BUMP_TYPE=${1:-patch}

if [[ "$BUMP_TYPE" != "major" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "patch" ]]; then
  echo "Usage: $0 [major|minor|patch]"
  exit 1
fi

NEW_VERSION=$(npm version "$BUMP_TYPE" --no-git-tag-version)

echo "Version bumped to $NEW_VERSION"
echo ""
echo "Remember to:"
echo "  1. Update public/changelog.json with the new version entry"
echo "  2. Run: npm run build && vercel --prod"
echo "  3. Commit: git add -A && git commit -m \"release: $NEW_VERSION\""
