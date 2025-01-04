import pytest
from lit_python_sdk import connect
import time
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file in the root directory
dotenv_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path)

client = connect()
client.set_auth_token(os.getenv("LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY"))


def test_execute():    
    # Execute a simple JavaScript code
    js_code = """
        (async () => {
            console.log("This is a log");
            Lit.Actions.setResponse({response: "Hello, World!"});
        })()
    """
    
    result = client.execute_js(js_code)

    print(result)
    
    # Check if the execution was successful
    # correct response is {'success': True, 'signedData': {}, 'decryptedData': {}, 'claimData': {}, 'response': 'Hello, World!', 'logs': 'This is a log\n'}
    assert result['success'] == True, "Expected success to be True"
    assert result['response'] == 'Hello, World!', "Expected response to be 'Hello, World!'"
    assert result['logs'] == 'This is a log\n', "Expected logs to be 'This is a log\n'"

def test_create_wallet_and_sign():
    wallet = client.create_wallet()
    print(wallet)
    to_sign = "0xadb20420bde8cda6771249188817098fca8ccf8eef2120a31e3f64f5812026bf"
    signature = client.sign(to_sign)
    print(signature)

# def test_multi_connect():
#     client2 = connect()
#     assert client2.get_pkp() == client.get_pkp()