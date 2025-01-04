# Lit Protocol Go SDK

This is the Go SDK for Lit Protocol. It provides a Go interface to interact with the Lit Protocol by wrapping the JavaScript SDK.

## Prerequisites

- Go 1.16 or higher
- Node.js 14 or higher

## Installation

```bash
go get github.com/LIT-Protocol/lit-polyglot-sdk/go/lit_go_sdk
```

## Usage

Here's a basic example of how to use the SDK:

```go
package main

import (
    "fmt"
    "github.com/LIT-Protocol/lit-polyglot-sdk/go/lit_go_sdk"
)

func main() {
    // Create a new client
    client, err := lit_go_sdk.NewLitClient()
    if err != nil {
        panic(err)
    }
    defer client.Close()

    // Set auth token
    result, err := client.SetAuthToken("your-auth-token")
    if err != nil {
        panic(err)
    }
    fmt.Printf("Set auth token result: %v\n", result)

    // Create a wallet
    wallet, err := client.CreateWallet()
    if err != nil {
        panic(err)
    }
    fmt.Printf("Created wallet: %v\n", wallet)

    // Get PKP
    pkp, err := client.GetPKP()
    if err != nil {
        panic(err)
    }
    fmt.Printf("PKP: %v\n", pkp)

    // Sign a message
    signature, err := client.Sign("Hello, World!")
    if err != nil {
        panic(err)
    }
    fmt.Printf("Signature: %v\n", signature)
}
```

## API Reference

### NewLitClient() (\*LitClient, error)

Creates a new Lit Protocol client.

### SetAuthToken(authToken string) (map[string]interface{}, error)

Sets the authentication token for the Lit Protocol.

### ExecuteJS(code string) (map[string]interface{}, error)

Executes JavaScript code on the Node.js server.

### CreateWallet() (map[string]interface{}, error)

Creates a new wallet.

### GetPKP() (map[string]interface{}, error)

Gets the PKP (Programmable Key Pair).

### Sign(toSign string) (map[string]interface{}, error)

Signs a message with the PKP.

### Close() error

Closes the client and stops the Node.js server if it was started by this client.

## Error Handling

All methods return an error as their second return value. You should always check for errors before using the results.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
