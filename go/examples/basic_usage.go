package main

import (
	"fmt"
	"log"

	lit "github.com/LIT-Protocol/lit-polyglot-sdk/go/lit_go_sdk"
)

func main() {
	// Initialize the Lit client
	client, err := lit.NewLitClient()
	if err != nil {
		log.Fatalf("Failed to create Lit client: %v", err)
	}
	defer client.Close()

	// Execute a simple JavaScript code
	jsCode := `
		(async () => {
			console.log("Hello from Lit Protocol!");
			Lit.Actions.setResponse({response: "Hello, World!"});
		})()
	`

	result, err := client.ExecuteJS(jsCode)
	if err != nil {
		log.Fatalf("Failed to execute JS: %v", err)
	}

	// Print the execution results
	fmt.Printf("Execution success: %v\n", result["success"])
	fmt.Printf("Response: %v\n", result["response"])
	fmt.Printf("Logs: %v\n", result["logs"])

	// Create a new wallet
	wallet, err := client.CreateWallet()
	if err != nil {
		log.Fatalf("Failed to create wallet: %v", err)
	}

	fmt.Printf("\nCreated new wallet with address: %s\n", wallet["address"])
}
