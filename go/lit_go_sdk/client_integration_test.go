package lit_go_sdk

import (
	"os"
	"testing"

	"github.com/joho/godotenv"
)

var (
	integrationClient *LitClient
)

func TestMain(m *testing.M) {
	// Load .env file from root directory
	godotenv.Load("../../.env")

	// Create a single client for all tests
	var err error
	integrationClient, err = NewLitClient()
	if err != nil {
		panic(err)
	}

	// Set auth token from environment
	authToken := os.Getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY")
	if authToken == "" {
		panic("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY environment variable is required")
	}

	_, err = integrationClient.SetAuthToken(authToken)
	if err != nil {
		panic(err)
	}

	// Run tests
	code := m.Run()

	// Cleanup
	integrationClient.Close()

	os.Exit(code)
}

func TestIntegration_Execute(t *testing.T) {
	// Execute a simple JavaScript code
	jsCode := `
		(async () => {
			console.log("This is a log");
			Lit.Actions.setResponse({response: "Hello, World!"});
		})()
	`

	result, err := integrationClient.ExecuteJS(jsCode)
	if err != nil {
		t.Fatalf("ExecuteJS() error = %v", err)
	}

	// Check if the execution was successful
	success, ok := result["success"].(bool)
	if !ok || !success {
		t.Errorf("Expected success to be true, got %v", result["success"])
	}

	response, ok := result["response"].(string)
	if !ok || response != "Hello, World!" {
		t.Errorf("Expected response to be 'Hello, World!', got %v", result["response"])
	}

	logs, ok := result["logs"].(string)
	if !ok || logs != "This is a log\n" {
		t.Errorf("Expected logs to be 'This is a log\n', got %v", result["logs"])
	}
}

func TestIntegration_CreateWalletAndSign(t *testing.T) {
	// Create a wallet
	wallet, err := integrationClient.CreateWallet()
	if err != nil {
		t.Fatalf("CreateWallet() error = %v", err)
	}
	// Print wallet object for debugging
	// t.Logf("Wallet object: %+v", wallet)
	// Verify wallet creation
	pkpMap, ok := wallet["pkp"].(map[string]interface{})
	if !ok || pkpMap["ethAddress"] == nil {
		t.Error("Expected wallet to have an address")
	}

	// Sign a message
	toSign := "0xadb20420bde8cda6771249188817098fca8ccf8eef2120a31e3f64f5812026bf"
	signature, err := integrationClient.Sign(toSign)
	if err != nil {
		t.Fatalf("Sign() error = %v", err)
	}

	// Verify signature
	if signature["signature"] == nil {
		t.Error("Expected signature in response")
	}
}

func TestIntegration_GetPKP(t *testing.T) {
	pkp, err := integrationClient.GetPKP()
	if err != nil {
		t.Fatalf("GetPKP() error = %v", err)
	}
	// Print PKP object for debugging
	// t.Logf("PKP object: %+v", pkp)
	// Verify PKP response
	if pkp["ethAddress"] == nil || pkp["ethAddress"] == "" {
		t.Error("Expected PKP in response")
	}
}

func TestIntegration_MultiConnect(t *testing.T) {
	// Create a second client
	client2, err := NewLitClient()
	if err != nil {
		t.Fatalf("NewLitClient() error = %v", err)
	}
	defer client2.Close()

	// Get PKP from both clients
	pkp1, err := integrationClient.GetPKP()
	if err != nil {
		t.Fatalf("GetPKP() error from client1 = %v", err)
	}

	pkp2, err := client2.GetPKP()
	if err != nil {
		t.Fatalf("GetPKP() error from client2 = %v", err)
	}

	// Compare PKPs
	if pkp1["pkp"] != pkp2["pkp"] {
		t.Error("Expected both clients to have the same PKP")
	}
}
