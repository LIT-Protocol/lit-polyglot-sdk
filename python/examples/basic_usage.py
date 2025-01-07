import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from lit_python_sdk import connect
from eth_account import Account


# Load environment variables from root .env file
root_dir = Path(__file__).parent.parent.parent
load_dotenv(root_dir / ".env")

def main():
    # Initialize the client
    client = connect()
    
    # Set up authentication using private key
    private_key = os.getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY")
    if not private_key:
        raise ValueError("Please set LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY in the root .env file")
    
    client.set_auth_token(private_key)

    # get wallet address from the private key
    private_key = os.getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY")
    if not private_key:
        raise ValueError("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY environment variable is required")
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key
    account = Account.from_key(private_key)
    wallet_address = account.address

    print("1. Initializing and connecting to Lit Network...")
    # Initialize and connect to the network
    client.new(lit_network="datil-test", debug=True)
    client.connect()
    print("✓ Connected to Lit Network")

    print("\n2. Getting session signatures and executing JS code...")
    # Get session signatures for JS execution
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

    # Execute simple JS code
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
    print("✓ JS Execution Result:", result)

    print("\n3. Setting up contracts client for PKP minting...")
    # Initialize the contracts client
    client.new_lit_contracts_client(
        private_key=private_key,
        network="datil-test",
        debug=True
    )

    print("\n4. Creating SIWE message and generating auth signature...")
    
    # Create a SIWE message for authentication
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
        wallet_address=wallet_address
    )

    # Generate auth signature
    auth_sig_result = client.generate_auth_sig(siwe_result["siweMessage"])

    print("\n5. Minting a new PKP...")
    # Mint a new PKP
    mint_result = client.mint_with_auth(
        auth_method={
            "authMethodType": 1,  # EthWallet
            "accessToken": auth_sig_result["authSig"],
        },
        scopes=[1]
    )
    pkp = mint_result["pkp"]
    print("✓ Minted PKP with public key:", pkp["publicKey"])

    print("\n6. Getting session signatures for PKP signing...")
    # Get session signatures for signing
    signing_session_sigs_result = client.get_session_sigs(
        chain="ethereum",
        expiration=expiration,
        resource_ability_requests=[{
            "resource": {
                "resource": "*",
                "resourcePrefix": "lit-pkp",
            },
            "ability": "pkp-signing",
        },{
            "resource": {
                "resource": "*",
                "resourcePrefix": "lit-litaction",
            },
            "ability": "lit-action-execution",
        }]
    )
    signing_session_sigs = signing_session_sigs_result["sessionSigs"]

    print("\n7. Signing a message with the PKP...")
    # Sign a message
    to_sign_hex = "0xadb20420bde8cda6771249188817098fca8ccf8eef2120a31e3f64f5812026bf"
    hex_str = to_sign_hex[2:] if to_sign_hex.startswith("0x") else to_sign_hex
    to_sign = [int(hex_str[i:i+2], 16) for i in range(0, len(hex_str), 2)]

    signature = client.pkp_sign(
        pub_key=pkp["publicKey"],
        to_sign=to_sign,
        session_sigs=signing_session_sigs
    )
    print("✓ Signature:", signature)

if __name__ == "__main__":
    main() 