package lit_go_sdk

import (
	"crypto/ecdsa"
	"encoding/hex"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/joho/godotenv"
)

var (
	integrationClient *LitNodeClient
)

func TestMain(m *testing.M) {
	// Load .env file from root directory
	godotenv.Load("../../.env")

	// Create a single client for all tests
	var err error
	integrationClient, err = NewLitNodeClient()
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

func TestIntegration_BasicFlow(t *testing.T) {
	// Test New
	_, err := integrationClient.New(LitNodeClientConfig{
		LitNetwork: "datil-test",
		Debug:      true,
	})
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	// Test Connect
	_, err = integrationClient.Connect()
	if err != nil {
		t.Fatalf("Connect() error = %v", err)
	}

	// Test GetProperty
	result, err := integrationClient.GetProperty("ready")
	if err != nil {
		t.Fatalf("GetProperty() error = %v", err)
	}
	if ready, ok := result["property"].(bool); !ok || !ready {
		t.Errorf("Expected ready to be true, got %v", result["property"])
	}

	// Test Disconnect
	_, err = integrationClient.Disconnect()
	if err != nil {
		t.Fatalf("Disconnect() error = %v", err)
	}

	// connect again so we leave it in connected state
	_, err = integrationClient.Connect()
	if err != nil {
		t.Fatalf("Connect() error = %v", err)
	}

	// loop until ready again
	isReady := false
	for !isReady {
		result, err := integrationClient.GetProperty("ready")
		if err != nil {
			t.Fatalf("GetProperty() error = %v", err)
		}
		ready, ok := result["property"].(bool)
		if !ok {
			t.Errorf("Expected ready to be true, got %v", result["property"])
		}
		isReady = ready
	}
}

func TestIntegration_ExecuteJs(t *testing.T) {
	// First get session sigs
	sessionSigsResult, err := integrationClient.GetSessionSigs(SessionSigsParams{
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
		t.Fatalf("GetSessionSigs() error = %v", err)
	}

	sessionSigs, ok := sessionSigsResult["sessionSigs"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected sessionSigs in response")
	}

	// Now execute JS
	result, err := integrationClient.ExecuteJs(ExecuteJsParams{
		Code: `
			(async () => {
				console.log("Testing executeJs endpoint");
				Lit.Actions.setResponse({response: "Test successful"});
			})()
		`,
		JsParams:    map[string]interface{}{},
		SessionSigs: sessionSigs,
	})
	if err != nil {
		t.Fatalf("ExecuteJs() error = %v", err)
	}

	response, ok := result["response"].(string)
	if !ok || response != "Test successful" {
		t.Errorf("Expected response to be 'Test successful', got %v", result["response"])
	}
}

func TestIntegration_ContractsAndAuth(t *testing.T) {
	// Test NewLitContractsClient
	_, err := integrationClient.NewLitContractsClient(LitContractsClientConfig{
		PrivateKey: os.Getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY"),
		Network:    "datil-test",
		Debug:      true,
	})
	if err != nil {
		t.Fatalf("NewLitContractsClient() error = %v", err)
	}

	// Derive wallet address from private key
	privateKeyHex := os.Getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY")
	if privateKeyHex == "" {
		t.Fatal("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY environment variable not set")
	}

	privateKeyBytes, err := hex.DecodeString(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		t.Fatalf("Failed to decode private key: %v", err)
	}

	privateKey, err := crypto.ToECDSA(privateKeyBytes)
	if err != nil {
		t.Fatalf("Failed to convert private key: %v", err)
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		t.Fatal("Failed to get public key")
	}

	address := crypto.PubkeyToAddress(*publicKeyECDSA).Hex()
	t.Logf("Using wallet address: %s", address)

	// Create SIWE message
	siweResult, err := integrationClient.CreateSiweMessage(CreateSiweMessageParams{
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
		WalletAddress: address,
	})
	if err != nil {
		t.Fatalf("CreateSiweMessage() error = %v", err)
	}

	siweMessage, ok := siweResult["siweMessage"].(string)
	if !ok {
		t.Fatal("Expected siweMessage in response")
	}

	// Generate auth sig
	authSigResult, err := integrationClient.GenerateAuthSig(siweMessage)
	if err != nil {
		t.Fatalf("GenerateAuthSig() error = %v", err)
	}

	authSig, ok := authSigResult["authSig"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected authSig in response")
	}

	// Test MintWithAuth
	mintResult, err := integrationClient.MintWithAuth(MintWithAuthParams{
		AuthMethod: map[string]interface{}{
			"authMethodType": 1, // EthWallet
			"accessToken":    authSig,
		},
		Scopes: []int{1},
	})
	if err != nil {
		t.Fatalf("MintWithAuth() error = %v", err)
	}

	pkp, ok := mintResult["pkp"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected PKP in response")
	}

	// Test PKPSign
	sessionSigsResult, err := integrationClient.GetSessionSigs(SessionSigsParams{
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
		t.Fatalf("GetSessionSigs() error = %v", err)
	}

	sessionSigs, ok := sessionSigsResult["sessionSigs"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected sessionSigs in response")
	}

	toSignHex := "0xadb20420bde8cda6771249188817098fca8ccf8eef2120a31e3f64f5812026bf"
	hexStr := strings.TrimPrefix(toSignHex, "0x")
	bytes, _ := hex.DecodeString(hexStr)
	toSign := make([]int, len(bytes))
	for i, b := range bytes {
		toSign[i] = int(b)
	}

	signResult, err := integrationClient.PKPSign(PKPSignParams{
		PubKey:      "0x" + pkp["publicKey"].(string),
		ToSign:      toSign,
		SessionSigs: sessionSigs,
	})
	if err != nil {
		t.Fatalf("PKPSign() error = %v", err)
	}

	if signResult["signature"] == nil {
		t.Error("Expected signature in response")
	}
}
