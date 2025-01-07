package main

import (
	"crypto/ecdsa"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/joho/godotenv"
	lit "github.com/lit-protocol/lit-polyglot-sdk/go/lit_go_sdk"
)

func main() {
	// Load environment variables from root .env file
	rootDir := filepath.Join("..", "..")
	if err := godotenv.Load(filepath.Join(rootDir, ".env")); err != nil {
		log.Fatalf("Error loading .env file from root directory: %v", err)
	}

	// Get private key from environment
	privateKeyHex := os.Getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY")
	if privateKeyHex == "" {
		log.Fatal("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY environment variable is required")
	}
	privateKeyBytes, err := hex.DecodeString(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		log.Fatalf("Failed to decode private key: %v", err)
	}

	privateKey, err := crypto.ToECDSA(privateKeyBytes)
	if err != nil {
		log.Fatalf("Failed to convert private key: %v", err)
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Fatal("Failed to get public key")
	}

	walletAddress := crypto.PubkeyToAddress(*publicKeyECDSA).Hex()

	// Initialize the Lit client
	client, err := lit.NewLitNodeClient()
	if err != nil {
		log.Fatalf("Failed to create Lit client: %v", err)
	}
	defer client.Close()

	// Set auth token (private key)
	_, err = client.SetAuthToken(privateKeyHex)
	if err != nil {
		log.Fatalf("Failed to set auth token: %v", err)
	}

	// Initialize with network config
	_, err = client.New(lit.LitNodeClientConfig{
		LitNetwork: "datil-dev",
		Debug:      true,
	})
	if err != nil {
		log.Fatalf("Failed to initialize client: %v", err)
	}

	// Get session signatures for executing JavaScript
	sessionSigsResult, err := client.GetSessionSigs(lit.SessionSigsParams{
		Chain:      "ethereum",
		Expiration: time.Now().Add(10 * time.Minute).Format(time.RFC3339),
		ResourceAbilityRequests: []interface{}{
			map[string]interface{}{
				"resource": map[string]interface{}{
					"resource":       "*",
					"resourcePrefix": "lit-pkp",
				},
				"ability": "pkp-signing",
			},
			map[string]interface{}{
				"resource": map[string]interface{}{
					"resource":       "*",
					"resourcePrefix": "lit-litaction",
				},
				"ability": "lit-action-execution",
			},
		},
	})
	if err != nil {
		log.Fatalf("Failed to get session signatures: %v", err)
	}

	sessionSigs := sessionSigsResult["sessionSigs"].(map[string]interface{})

	// Execute JavaScript code
	result, err := client.ExecuteJs(lit.ExecuteJsParams{
		Code: `
			(async () => {
				console.log("Hello from Lit Protocol!");
				Lit.Actions.setResponse({response: "Hello, World!"});
			})()
		`,
		JsParams:    map[string]interface{}{},
		SessionSigs: sessionSigs,
	})
	if err != nil {
		log.Fatalf("Failed to execute JS: %v", err)
	}

	// Print the execution results
	fmt.Printf("Response: %v\n", result["response"])
	fmt.Printf("Logs: %v\n", result["logs"])

	// Create SIWE message for authentication
	siweResult, err := client.CreateSiweMessage(lit.CreateSiweMessageParams{
		URI:        "http://localhost:3092",
		Expiration: time.Now().Add(10 * time.Minute).Format(time.RFC3339),
		Resources: []interface{}{
			map[string]interface{}{
				"resource": map[string]interface{}{
					"resource":       "*",
					"resourcePrefix": "lit-litaction",
				},
				"ability": "lit-action-execution",
			},
		},
		WalletAddress: walletAddress,
	})
	if err != nil {
		log.Fatalf("Failed to create SIWE message: %v", err)
	}

	// Generate auth signature
	authSigResult, err := client.GenerateAuthSig(siweResult["siweMessage"].(string))
	if err != nil {
		log.Fatalf("Failed to generate auth signature: %v", err)
	}

	// Mint a new PKP with auth
	mintResult, err := client.MintWithAuth(lit.MintWithAuthParams{
		AuthMethod: map[string]interface{}{
			"authMethodType": 1, // EthWallet
			"accessToken":    authSigResult["authSig"],
		},
		Scopes: []int{1}, // Basic PKP scope
	})
	if err != nil {
		log.Fatalf("Failed to mint PKP: %v", err)
	}

	pkp := mintResult["pkp"].(map[string]interface{})
	fmt.Printf("Minted PKP with public key: %v\n", pkp["publicKey"])

	// Example message to sign
	toSignHex := "0xadb20420bde8cda6771249188817098fca8ccf8eef2120a31e3f64f5812026bf"
	hexStr := strings.TrimPrefix(toSignHex, "0x")
	bytes, err := hex.DecodeString(hexStr)
	if err != nil {
		log.Fatalf("Failed to decode hex string: %v", err)
	}
	toSign := make([]int, len(bytes))
	for i, b := range bytes {
		toSign[i] = int(b)
	}

	// Sign with PKP
	signResult, err := client.PKPSign(lit.PKPSignParams{
		PubKey:      pkp["publicKey"].(string),
		ToSign:      toSign,
		SessionSigs: sessionSigs,
	})
	if err != nil {
		log.Fatalf("Failed to sign with PKP: %v", err)
	}

	fmt.Printf("Signature: %v\n", signResult["signature"])
}
