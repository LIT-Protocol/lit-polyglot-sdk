package main

import (
	"context"
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

	// Create a context
	ctx := context.Background()

	// Connect to the Lit nodes
	if err := client.Connect(ctx); err != nil {
		log.Fatalf("Failed to connect to Lit nodes: %v", err)
	}
	defer client.Disconnect()

	fmt.Println("Successfully connected to Lit Protocol!")

	// Get the latest network config
	config, err := client.GetNetworkConfig(ctx)
	if err != nil {
		log.Fatalf("Failed to get network config: %v", err)
	}

	fmt.Printf("Current network has %d nodes\n", len(config.NetworkPubKeySet))
}
