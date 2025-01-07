import pytest
import time
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path
from lit_python_sdk import connect

# Load environment variables from .env file in the root directory
dotenv_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path)

# Create a single client for all tests
client = connect()
client.set_auth_token(os.getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY"))

def test_basic_flow():
    # Test New
    result = client.new(lit_network="datil-test", debug=True)
    assert result["success"] == True, "Expected success to be True"

    # Test Connect
    result = client.connect()
    assert result["success"] == True, "Expected success to be True"

    # Test GetProperty
    result = client.get_property("ready")
    assert result["property"] == True, "Expected ready to be True"

    # Test Disconnect
    result = client.disconnect()
    assert result["success"] == True, "Expected success to be True"

    # Connect again so we leave it in connected state
    result = client.connect()
    assert result["success"] == True, "Expected success to be True"

def test_execute_js():
    # First get session sigs
    expiration = (datetime.now() + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
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
    assert "sessionSigs" in session_sigs_result, "Expected sessionSigs in response"
    session_sigs = session_sigs_result["sessionSigs"]

    # Now execute JS
    result = client.execute_js(
        code="""
            (async () => {
                console.log("Testing executeJs endpoint");
                Lit.Actions.setResponse({response: "Test successful"});
            })()
        """,
        js_params={},
        session_sigs=session_sigs
    )

    assert result["response"] == "Test successful", "Expected response to be 'Test successful'"

def test_contracts_and_auth():
    # Test NewLitContractsClient
    result = client.new_lit_contracts_client(
        private_key=os.getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY"),
        network="datil-test",
        debug=True
    )
    assert result["success"] == True, "Expected success to be True"

    # Create SIWE message
    expiration = (datetime.now() + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
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
        wallet_address=os.getenv("LIT_POLYGLOT_SDK_TEST_WALLET_ADDRESS")
    )
    assert "siweMessage" in siwe_result, "Expected siweMessage in response"

    # Generate auth sig
    auth_sig_result = client.generate_auth_sig(siwe_result["siweMessage"])
    assert "authSig" in auth_sig_result, "Expected authSig in response"

    # Test MintWithAuth
    mint_result = client.mint_with_auth(
        auth_method={
            "authMethodType": 1,  # EthWallet
            "accessToken": auth_sig_result["authSig"],
        },
        scopes=[1]
    )
    assert "pkp" in mint_result, "Expected PKP in response"
    pkp = mint_result["pkp"]

    # Test PKPSign
    expiration = (datetime.now() + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
    session_sigs_result = client.get_session_sigs(
        chain="ethereum",
        expiration=expiration,
        resource_ability_requests=[{
            "resource": {
                "resource": "*",
                "resourcePrefix": "lit-pkp",
            },
            "ability": "pkp-signing",
        }, {
            "resource": {
                "resource": "*",
                "resourcePrefix": "lit-litaction",
            },
            "ability": "lit-action-execution",
        }]
    )
    assert "sessionSigs" in session_sigs_result, "Expected sessionSigs in response"
    session_sigs = session_sigs_result["sessionSigs"]

    # Convert hex string to bytes array for signing
    to_sign_hex = "0xadb20420bde8cda6771249188817098fca8ccf8eef2120a31e3f64f5812026bf"
    hex_str = to_sign_hex[2:] if to_sign_hex.startswith("0x") else to_sign_hex
    to_sign = [int(hex_str[i:i+2], 16) for i in range(0, len(hex_str), 2)]

    sign_result = client.pkp_sign(
        pub_key=pkp["publicKey"],
        to_sign=to_sign,
        session_sigs=session_sigs
    )
    assert "signature" in sign_result, "Expected signature in response"