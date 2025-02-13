module lit-examples

go 1.22

toolchain go1.22.10

require (
	github.com/ethereum/go-ethereum v1.14.12
	github.com/joho/godotenv v1.5.1
	github.com/lit-protocol/lit-polyglot-sdk/go/lit_go_sdk v1.2.0
)

require (
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.3.0 // indirect
	github.com/holiman/uint256 v1.3.2 // indirect
	golang.org/x/crypto v0.32.0 // indirect
	golang.org/x/sys v0.29.0 // indirect
)

// turn this on to use the local lit_go_sdk when doing development
// replace github.com/lit-protocol/lit-polyglot-sdk/go/lit_go_sdk => ../lit_go_sdk
