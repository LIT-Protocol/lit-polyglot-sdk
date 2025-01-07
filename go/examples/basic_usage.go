package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

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
	privateKey := os.Getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY")
	if privateKey == "" {
		log.Fatal("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY environment variable is required")
	}

	// Initialize the Lit client
	client, err := lit.NewLitNodeClient()
	if err != nil {
		log.Fatalf("Failed to create Lit client: %v", err)
	}
	defer client.Close()

	// Set auth token (private key)
	_, err = client.SetAuthToken(privateKey)
	if err != nil {
		log.Fatalf("Failed to set auth token: %v", err)
	}

	// Initialize with network config
	_, err = client.New(lit.LitNodeClientConfig{
		LitNetwork: "datil-test",
		Debug:      true,
	})
	if err != nil {
		log.Fatalf("Failed to initialize client: %v", err)
	}

	// Connect to the Lit network
	_, err = client.Connect()
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	// Get session signatures for executing JavaScript
	sessionSigsResult, err := client.GetSessionSigs(lit.SessionSigsParams{
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
}
