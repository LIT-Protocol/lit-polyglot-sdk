# lit-python-sdk

A Python SDK for interacting with the Lit Protocol.

## Getting Started

The Lit Python SDK provides a simple way to interact with the Lit Protocol from Python applications. The SDK automatically manages a Node.js server (using [nodejs-bin](https://pypi.org/project/nodejs-bin/)) to communicate with the Lit Network.

### Installation

Install the SDK in your Python environment:

```bash
pip install -e .
```

### Authentication

Before using the SDK, you'll need to set up authentication using a private key.

```python
from lit_python_sdk import connect

# Initialize the client
client = connect()
client.set_auth_token(os.getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY"))

# Initialize and connect to the network
client.new(lit_network="datil-test", debug=True)
client.connect()
```

## Features and Examples

### Executing JavaScript Code on the Lit Network

You can execute JavaScript code across the Lit Network. First, you'll need to get session signatures, then execute the code:

```python
from datetime import datetime, timedelta, timezone

# Get session signatures
expiration = (datetime.now(timezone.utc) + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
session_sigs_result = client.get_session_sigs(
    chain="ethereum",
    expiration=expiration,
    resource_ability_requests=[{
        "resource": {
            "resource": "*",
            "resourcePrefix": "lit-litaction",
        },
        "ability": "lit-action-execution",
    }]
)
session_sigs = session_sigs_result["sessionSigs"]

# Execute the code
js_code = """
(async () => {
    console.log("Testing executeJs endpoint");
    Lit.Actions.setResponse({response: "Test successful"});
})()
"""

result = client.execute_js(
    code=js_code,
    js_params={},
    session_sigs=session_sigs
)

# The result contains:
# - response: any data set using Lit.Actions.setResponse
# - logs: console output from the execution
```

### Minting PKPs and Signing Messages

The SDK allows you to mint a PKP (Programmable Key Pair) and sign messages:

```python
# Initialize the contracts client
client.new_lit_contracts_client(
    private_key=os.getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY"),
    network="datil-test",
    debug=True
)

# Create a SIWE message for authentication
expiration = (datetime.now(timezone.utc) + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
siwe_result = client.create_siwe_message(
    uri="http://localhost:3092",
    expiration=expiration,
    resources=[{
        "resource": {
            "resource": "*",
            "resourcePrefix": "lit-litaction",
        },
        "ability": "lit-action-execution",
    }],
    wallet_address=wallet_address  # Your wallet address, derived from the private key you use for your auth token.
)

# Generate auth signature
auth_sig_result = client.generate_auth_sig(siwe_result["siweMessage"])

# Mint a new PKP
mint_result = client.mint_with_auth(
    auth_method={
        "authMethodType": 1,  # EthWallet
        "accessToken": auth_sig_result["authSig"],
    },
    scopes=[1]
)
pkp = mint_result["pkp"]

# Get session signatures for signing
session_sigs_result = client.get_session_sigs(
    chain="ethereum",
    expiration=expiration,
    resource_ability_requests=[{
        "resource": {
            "resource": "*",
            "resourcePrefix": "lit-pkp",
        },
        "ability": "pkp-signing",
    },
    {
        "resource": {
            "resource": "*",
            "resourcePrefix": "lit-litaction",
        },
        "ability": "lit-action-execution",
    }]
)
session_sigs = session_sigs_result["sessionSigs"]

# Sign a message
to_sign_hex = "0xadb20420bde8cda6771249188817098fca8ccf8eef2120a31e3f64f5812026bf"
hex_str = to_sign_hex[2:] if to_sign_hex.startswith("0x") else to_sign_hex
to_sign = [int(hex_str[i:i+2], 16) for i in range(0, len(hex_str), 2)]

signature = client.pkp_sign(
    pub_key=pkp["publicKey"],
    to_sign=to_sign,
    session_sigs=session_sigs
)
```

### String Encryption and Decryption

The SDK provides methods to encrypt and decrypt strings using the Lit Protocol. This allows you to create access-controlled encrypted content:

```python
from datetime import datetime, timedelta, timezone

# Get session signatures for decryption
expiration = (datetime.now(timezone.utc) + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
session_sigs_result = client.get_session_sigs(
    chain="ethereum",
    expiration=expiration,
    resource_ability_requests=[{
        "resource": {
            "resource": "*",
            "resourcePrefix": "lit-litaction",
        },
        "ability": "lit-action-execution",
    }, {
        "resource": {
            "resource": "*",
            "resourcePrefix": "lit-pkp",
        },
        "ability": "pkp-signing",
    }]
)
session_sigs = session_sigs_result["sessionSigs"]

# Define access control conditions
# This example allows only a specific wallet address to decrypt the content
access_control_conditions = [{
    "contractAddress": "",
    "standardContractType": "",
    "chain": "ethereum",
    "method": "",
    "parameters": [":userAddress"],
    "returnValueTest": {
        "comparator": "=",
        "value": "0x..." # Replace with the authorized wallet address
    }
}]

# Encrypt a string
encrypt_result = client.encrypt_string(
    data_to_encrypt="Hello, World!",
    access_control_conditions=access_control_conditions
)

# The encrypt_result contains:
# - ciphertext: the encrypted string
# - dataToEncryptHash: hash of the original data

# Decrypt the string
decrypt_result = client.decrypt_string(
    ciphertext=encrypt_result["ciphertext"],
    data_to_encrypt_hash=encrypt_result["dataToEncryptHash"],
    chain="ethereum",
    access_control_conditions=access_control_conditions,
    session_sigs=session_sigs
)

# decrypt_result["decryptedString"] contains the original message
print(decrypt_result["decryptedString"])  # Output: "Hello, World!"
```

You can also use other types of access control conditions:

- EVM contract conditions (`evm_contract_conditions`)
- Solana RPC conditions (`sol_rpc_conditions`)
- Unified access control conditions (`unified_access_control_conditions`)

## Development Setup

For development and testing:

1. Install test dependencies:

```bash
pip install pytest
```

2. Bundle the Node.js server dependencies:

```bash
cd js-sdk-server && npm install && npm run build
```

3. Run tests:

```bash
pytest
```
