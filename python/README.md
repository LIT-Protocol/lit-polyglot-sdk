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

Before using the SDK, you'll need to set up authentication using a private key. You can either:
1. Set the environment variable:
```bash
export LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY=your_private_key_here
```

2. Or provide it in your code:
```python
from lit_python_sdk import connect

# Initialize the client
client = connect()
client.set_auth_token(os.getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY"))
```

## Features and Examples

### Executing JavaScript Code on the Lit Network

You can execute JavaScript code across the Lit Network using the `execute_js` method:

```python
# Define your JavaScript code
js_code = """
(async () => {
    console.log("This is a log");
    Lit.Actions.setResponse({response: "Hello, World!"});
})()
"""

# Execute the code
result = client.execute_js(js_code)

# The result contains:
# - success: boolean indicating if execution was successful
# - response: any data set using Lit.Actions.setResponse
# - logs: console output from the execution
```

### Creating a Wallet and Signing Messages

The SDK allows you to create a PKP (Programmable Key Pair) wallet and sign messages:

```python
# Create a new PKP wallet
wallet = client.create_wallet()

# Sign a message
message = "0xadb20420bde8cda6771249188817098fca8ccf8eef2120a31e3f64f5812026bf"
signature = client.sign(message)
```

The wallet is a PKP-based wallet that lives across the Lit Nodes, and signing operations are performed securely within the Lit Network.

## Development Setup

For development and testing:

1. Install test dependencies:
```bash
pip install pytest
```

2. Bundle the Node.js server dependencies:
```bash
cd lit_python_sdk/nodejs && npm install
```

3. Run tests:
```bash
pytest
```
