#!/bin/bash

# List existing published versions
echo "Existing published versions:"
GOPROXY=proxy.golang.org go list -versions -m github.com/lit-protocol/lit-polyglot-sdk/go/lit_go_sdk

# Prompt for version number
read -p "Enter version number (without v prefix, e.g. 0.1.0): " VERSION_INPUT
VERSION="v$VERSION_INPUT"

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