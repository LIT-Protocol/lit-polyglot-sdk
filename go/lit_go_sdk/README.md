# Lit Protocol Go SDK

This is the Go SDK for Lit Protocol. It provides a Go interface to interact with the Lit Protocol by wrapping the JavaScript SDK.

## Prerequisites

- Go 1.16 or higher
- Node.js 14 or higher

## Installation

```bash
go get github.com/LIT-Protocol/lit-polyglot-sdk/go/lit_go_sdk
```

## Basic Usage

Here's a basic example of how to use the SDK:

```go
package main

import (
    "fmt"
    "github.com/LIT-Protocol/lit-polyglot-sdk/go/lit_go_sdk"
)

func main() {
    // Create a new client
    client, err := lit_go_sdk.NewLitNodeClient()
    if err != nil {
        panic(err)
    }
    defer client.Close()

    // Set auth token (your private key)
    _, err = client.SetAuthToken("your-private-key")
    if err != nil {
        panic(err)
    }

    // Initialize the client with network config
    _, err = client.New(lit_go_sdk.LitNodeClientConfig{
        LitNetwork: "datil-test", // or your preferred network
        Debug:      true,
    })
    if err != nil {
        panic(err)
    }

    // Connect to the Lit network
    _, err = client.Connect()
    if err != nil {
        panic(err)
    }
}
```

## Executing JavaScript on the Lit Network

You can execute JavaScript code across the Lit Network. First, get session signatures, then execute the code:

```go
// Get session signatures
sessionSigsResult, err := client.GetSessionSigs(lit_go_sdk.SessionSigsParams{
    Chain:      "ethereum",
    Expiration: time.Now().Add(10 * time.Minute).Format(time.RFC3339),
    ResourceAbilityRequests: []interface{}{
        map[string]interface{}{
            "resource": map[string]interface{}{
                "resource":       "*",
                "resourcePrefix": "lit-litaction",
            },
            "ability": "lit-action-execution",
        },
    },
})

sessionSigs := sessionSigsResult["sessionSigs"].(map[string]interface{})

// Execute JavaScript
result, err := client.ExecuteJs(lit_go_sdk.ExecuteJsParams{
    Code: `
        (async () => {
            console.log("Testing executeJs endpoint");
            Lit.Actions.setResponse({response: "Test successful"});
        })()
    `,
    JsParams:    map[string]interface{}{},
    SessionSigs: sessionSigs,
})
```

## Working with PKPs (Programmable Key Pairs)

The SDK supports minting and using PKPs. Here's how to mint a new PKP using ETH wallet authentication:

```go
// Create SIWE message
siweResult, err := client.CreateSiweMessage(lit_go_sdk.CreateSiweMessageParams{
    URI:           "http://localhost:3092",
    Expiration:    time.Now().Add(10 * time.Minute).Format(time.RFC3339),
    Resources: []interface{}{
        map[string]interface{}{
            "resource": map[string]interface{}{
                "resource":       "*",
                "resourcePrefix": "lit-litaction",
            },
            "ability": "lit-action-execution",
        },
    },
    WalletAddress: "your-eth-wallet-address",
})

// Generate auth signature
authSigResult, err := client.GenerateAuthSig(siweResult["siweMessage"].(string))

// Mint PKP
mintResult, err := client.MintWithAuth(lit_go_sdk.MintWithAuthParams{
    AuthMethod: map[string]interface{}{
        "authMethodType": 1, // EthWallet
        "accessToken":    authSigResult["authSig"],
    },
    Scopes: []int{1},
})
```

## String Encryption and Decryption

The SDK provides functionality to encrypt and decrypt strings with access control conditions. Here's how to use it:

```go
// First, get session signatures
sessionSigsResult, err := client.GetSessionSigs(lit_go_sdk.SessionSigsParams{
    Chain:      "ethereum",
    Expiration: time.Now().Add(10 * time.Minute).Format(time.RFC3339),
    ResourceAbilityRequests: []interface{}{
        map[string]interface{}{
            "resource": map[string]interface{}{
                "resource":       "*",
                "resourcePrefix": "lit-litaction",
            },
            "ability": "lit-action-execution",
        },
    },
})
sessionSigs := sessionSigsResult["sessionSigs"].(map[string]interface{})

// Encrypt a string
testString := "Hello, World!"
encryptResult, err := client.EncryptString(lit_go_sdk.EncryptStringParams{
    DataToEncrypt: testString,
    AccessControlConditions: []interface{}{
        map[string]interface{}{
            "contractAddress": "",
            "standardContractType": "",
            "chain": "ethereum",
            "method": "",
            "parameters": []string{":userAddress"},
            "returnValueTest": map[string]interface{}{
                "comparator": "=",
                "value": "your-eth-wallet-address",
            },
        },
    },
})

// Decrypt the string
decryptResult, err := client.DecryptString(lit_go_sdk.DecryptStringParams{
    Chain:             "ethereum",
    Ciphertext:        encryptResult["ciphertext"].(string),
    DataToEncryptHash: encryptResult["dataToEncryptHash"].(string),
    AccessControlConditions: []interface{}{
        map[string]interface{}{
            "contractAddress": "",
            "standardContractType": "",
            "chain": "ethereum",
            "method": "",
            "parameters": []string{":userAddress"},
            "returnValueTest": map[string]interface{}{
                "comparator": "=",
                "value": "your-eth-wallet-address",
            },
        },
    },
    SessionSigs: sessionSigs,
})

fmt.Printf("Decrypted string: %s\n", decryptResult["decryptedString"])
```

The encryption is tied to access control conditions, which means only users who meet those conditions (like owning a specific wallet address) can decrypt the data.

## API Reference

### NewLitNodeClient() (\*LitNodeClient, error)

Creates a new Lit Protocol client.

### SetAuthToken(authToken string) (map[string]interface{}, error)

Sets the authentication token (private key) for the Lit Protocol.

### New(config LitNodeClientConfig) (map[string]interface{}, error)

Initializes the client with network configuration.

### Connect() (map[string]interface{}, error)

Connects to the Lit network.

### ExecuteJs(params ExecuteJsParams) (map[string]interface{}, error)

Executes JavaScript code on the Lit network.

### GetSessionSigs(params SessionSigsParams) (map[string]interface{}, error)

Gets session signatures for authentication.

### CreateSiweMessage(params CreateSiweMessageParams) (map[string]interface{}, error)

Creates a Sign-In with Ethereum message.

### GenerateAuthSig(toSign string) (map[string]interface{}, error)

Generates an authentication signature.

### MintWithAuth(params MintWithAuthParams) (map[string]interface{}, error)

Mints a new PKP with authentication.

### EncryptString(params EncryptStringParams) (map[string]interface{}, error)

Encrypts a string with access control conditions.

### DecryptString(params DecryptStringParams) (map[string]interface{}, error)

Decrypts a string using session signatures and access control conditions.

### Close() error

Closes the client and stops the Node.js server.

## Error Handling

All methods return an error as their second return value. You should always check for errors before using the results.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Publishing

Run `./publish.sh` in the parent folder to publish a new version to the Go SDK. It will list existing versions and prompt you to enter the new version.
