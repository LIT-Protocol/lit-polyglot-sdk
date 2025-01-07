package lit_go_sdk

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// LitNodeClient represents the main client for interacting with the Lit SDK
type LitNodeClient struct {
	port   int
	server *NodeServer
}

// NewLitNodeClient creates a new instance of LitNodeClient
func NewLitNodeClient() (*LitNodeClient, error) {
	port := 3092
	client := &LitNodeClient{
		port: port,
	}

	// Check if server is already running
	if !client.isServerRunning() {
		server := NewNodeServer(port)
		if err := server.Start(); err != nil {
			return nil, fmt.Errorf("failed to start server: %w", err)
		}
		client.server = server

		if err := client.waitForServer(10 * time.Second); err != nil {
			server.Stop()
			return nil, err
		}
	}

	return client, nil
}

// isServerRunning checks if the Node.js server is already running
func (c *LitNodeClient) isServerRunning() bool {
	resp, err := http.Post(fmt.Sprintf("http://localhost:%d/isReady", c.port), "application/json", nil)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false
	}

	// fmt.Println("result from isReady:", result)

	return result["ready"] == true
}

// waitForServer waits for the server to become available
func (c *LitNodeClient) waitForServer(timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if c.isServerRunning() {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("server failed to start within timeout period")
}

// SetAuthToken sets the auth token on the Node.js server
func (c *LitNodeClient) SetAuthToken(authToken string) (map[string]interface{}, error) {
	payload := map[string]string{"authToken": authToken}
	return c.post("/setAuthToken", payload)
}

// post is a helper function to make POST requests
func (c *LitNodeClient) post(endpoint string, payload interface{}) (map[string]interface{}, error) {
	var body bytes.Buffer
	if payload != nil {
		if err := json.NewEncoder(&body).Encode(payload); err != nil {
			return nil, err
		}
	}

	resp, err := http.Post(
		fmt.Sprintf("http://localhost:%d%s", c.port, endpoint),
		"application/json",
		&body,
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

// Close stops the Node.js server if it was started by this client
func (c *LitNodeClient) Close() error {
	if c.server != nil {
		return c.server.Stop()
	}
	return nil
}

// LitNodeClientConfig represents the configuration for creating a new LitNodeClient instance
type LitNodeClientConfig struct {
	LitNetwork string `json:"litNetwork"`
	Debug      bool   `json:"debug"`
}

// ExecuteJsParams represents the parameters for executing JS code
type ExecuteJsParams struct {
	Code        string                 `json:"code"`
	JsParams    map[string]interface{} `json:"jsParams"`
	SessionSigs map[string]interface{} `json:"sessionSigs"`
}

// PKPSignParams represents the parameters for signing with a PKP
type PKPSignParams struct {
	PubKey      string                 `json:"pubKey"`
	ToSign      []int                  `json:"toSign"`
	SessionSigs map[string]interface{} `json:"sessionSigs"`
}

// SessionSigsParams represents the parameters for getting session signatures
type SessionSigsParams struct {
	Chain                   string        `json:"chain"`
	Expiration              string        `json:"expiration"`
	ResourceAbilityRequests []interface{} `json:"resourceAbilityRequests"`
}

// New initializes a new LitNodeClient instance on the server
func (c *LitNodeClient) New(config LitNodeClientConfig) (map[string]interface{}, error) {
	return c.post("/litNodeClient/new", config)
}

// Connect connects to the Lit network
func (c *LitNodeClient) Connect() (map[string]interface{}, error) {
	return c.post("/litNodeClient/connect", nil)
}

// GetProperty gets a property from the LitNodeClient
func (c *LitNodeClient) GetProperty(property string) (map[string]interface{}, error) {
	return c.post("/litNodeClient/getProperty", map[string]string{"property": property})
}

// ExecuteJs executes JavaScript code on the Lit network
func (c *LitNodeClient) ExecuteJs(params ExecuteJsParams) (map[string]interface{}, error) {
	return c.post("/litNodeClient/executeJs", params)
}

// GetSessionSigs gets session signatures
func (c *LitNodeClient) GetSessionSigs(params SessionSigsParams) (map[string]interface{}, error) {
	return c.post("/litNodeClient/getSessionSigs", params)
}

// PKPSign signs data using a PKP
func (c *LitNodeClient) PKPSign(params PKPSignParams) (map[string]interface{}, error) {
	return c.post("/litNodeClient/pkpSign", params)
}

// Disconnect disconnects from the Lit network
func (c *LitNodeClient) Disconnect() (map[string]interface{}, error) {
	return c.post("/litNodeClient/disconnect", nil)
}

// LitContractsClientConfig represents the configuration for creating a new LitContractsClient
type LitContractsClientConfig struct {
	PrivateKey string `json:"privateKey"`
	Network    string `json:"network"`
	Debug      bool   `json:"debug"`
}

// NewLitContractsClient initializes a new LitContractsClient
func (c *LitNodeClient) NewLitContractsClient(config LitContractsClientConfig) (map[string]interface{}, error) {
	return c.post("/litContractsClient/new", config)
}

// MintWithAuthParams represents the parameters for minting with auth
type MintWithAuthParams struct {
	AuthMethod map[string]interface{} `json:"authMethod"`
	Scopes     []int                  `json:"scopes"`
}

// MintWithAuth mints a new PKP with authentication
func (c *LitNodeClient) MintWithAuth(params MintWithAuthParams) (map[string]interface{}, error) {
	// json stringify the AuthSig
	authSig, ok := params.AuthMethod["accessToken"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("accessToken is not a map")
	}
	authSigJSON, err := json.Marshal(authSig)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal accessToken: %w", err)
	}
	params.AuthMethod["accessToken"] = string(authSigJSON)
	return c.post("/litContractsClient/mintWithAuth", params)
}

// CreateSiweMessageParams represents the parameters for creating a SIWE message
type CreateSiweMessageParams struct {
	URI           string        `json:"uri"`
	Expiration    string        `json:"expiration"`
	Resources     []interface{} `json:"resources"`
	WalletAddress string        `json:"walletAddress"`
}

// CreateSiweMessage creates a SIWE message
func (c *LitNodeClient) CreateSiweMessage(params CreateSiweMessageParams) (map[string]interface{}, error) {
	return c.post("/authHelpers/createSiweMessage", params)
}

// GenerateAuthSig generates an auth signature
func (c *LitNodeClient) GenerateAuthSig(toSign string) (map[string]interface{}, error) {
	return c.post("/authHelpers/generateAuthSig", map[string]string{"toSign": toSign})
}
