#!/bin/bash

# Check if version argument is provided
if [ -z "$1" ]; then
    echo "Please provide a version number (e.g. ./publish.sh 0.1.0)"
    exit 1
fi

VERSION="v$1"

cd lit_go_sdk

# Update go.mod and go.sum
go mod tidy

# Commit any changes to go.mod and go.sum
git add go.mod go.sum
git commit -m "chore: update go dependencies for $VERSION" || true

# Create and push the tag
git tag "go/lit_go_sdk/$VERSION"
git push origin "go/lit_go_sdk/$VERSION"

echo "Published version $VERSION of the Go SDK" 

GOPROXY=proxy.golang.org go list -m github.com/lit-protocol/lit-polyglot-sdk/go/lit_go_sdk@$VERSION