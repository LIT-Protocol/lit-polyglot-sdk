#!/bin/bash

# Check if version argument is provided
if [ -z "$1" ]; then
    echo "Please provide a version number (e.g. ./publish.sh 0.1.0)"
    exit 1
fi

VERSION="v$1"

# Ensure we're on the main branch and up to date
git checkout main
git pull origin main

# Update go.mod and go.sum
go mod tidy

# Commit any changes to go.mod and go.sum
git add go.mod go.sum
git commit -m "chore: update dependencies for $VERSION" || true

# Create and push the tag
git tag "go/$VERSION"
git push origin "go/$VERSION"

echo "Published version $VERSION of the Go SDK" 