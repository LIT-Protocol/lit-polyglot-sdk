# Lit Protocol Python SDK Examples

This directory contains example scripts demonstrating how to use the published Lit Protocol Python SDK.

## Basic Usage Example

The `basic_usage.py` script demonstrates core functionality of the Lit Protocol Python SDK including:

- Connecting to the Lit Network
- Executing JavaScript code on the network
- Minting a PKP (Programmable Key Pair)
- Signing messages with the PKP

### Prerequisites

1. Install the required dependencies (including the published Lit Python SDK):

```bash
pip install -r requirements.txt
```

2. Set up your environment variables by copying the example `.env` file in the root directory:

```bash
cp ../../.env.example ../../.env
```

3. Edit the `.env` file in the root directory and set your private key:

```
LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY="your_private_key_here"
```

### Running the Example

To run the basic usage example:

```bash
python basic_usage.py
```

The script will walk you through each step of the process with console output indicating what's happening.
