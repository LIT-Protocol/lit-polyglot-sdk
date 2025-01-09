import requests
import subprocess
import time
import json
from typing import Dict, Any, List, Optional
from .server import NodeServer

class LitClient:
    def __init__(self, port=3092):
        self.port = port
        # Check if server is already running by trying to connect
        try:
            response = requests.post(f"http://localhost:{port}/isReady")
            if response.json().get("ready"):
                # Server already running, don't start a new one
                self.server = None
                return
        except requests.exceptions.ConnectionError:
            # Server not running, start it
            self.server = NodeServer(port)
            self._start_server()

    def _start_server(self):
        """Starts the Node.js server and waits for it to be ready"""
        self.server.start()
        self._wait_for_server()

    def _wait_for_server(self, timeout=10):
        """Waits for the server to become available"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.post(f"http://localhost:{self.port}/isReady")
                result = response.json()
                if result.get("ready"):
                    return
                else:
                    time.sleep(0.1)
            except requests.exceptions.ConnectionError:
                time.sleep(0.1)
                
        raise TimeoutError("Server failed to start within timeout period")

    def _post(self, endpoint: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Helper function to make POST requests"""
        try:
            response = requests.post(
                f"http://localhost:{self.port}{endpoint}",
                json=payload
            )
            return response.json()
        except Exception as e:
            if self.server:
                logs = self.server.logs.get_contents()
                last_50_lines = '\n'.join(logs.splitlines()[-50:])
                print("\n=== Last 50 lines of server logs ===\n")
                print(last_50_lines)
            raise

    def set_auth_token(self, auth_token: str) -> Dict[str, Any]:
        """Sets the auth token on the Node.js server"""
        return self._post("/setAuthToken", {"authToken": auth_token})

    def new(
        self,
        lit_network: str,
        alert_when_unauthorized: bool = None,
        check_node_attestation: bool = None,
        connect_timeout: int = None,
        contract_context: Dict[str, Any] = None,
        debug: bool = None,
        default_auth_callback: Any = None,
        min_node_count: int = None,
        rpc_url: str = None,
        storage_provider: Any = None
    ) -> Dict[str, Any]:
        """Initializes a new LitNodeClient instance on the server
        
        Args:
            lit_network: The Lit network to connect to
            alert_when_unauthorized: Whether to alert when unauthorized
            check_node_attestation: Whether to check node attestation
            connect_timeout: Connection timeout in milliseconds
            contract_context: Contract context configuration
            debug: Enable debug logging
            default_auth_callback: Default callback for auth requests
            min_node_count: Minimum number of nodes required
            rpc_url: Custom RPC URL
            storage_provider: Custom storage provider
        """
        params = {
            "litNetwork": lit_network,
        }
        
        if alert_when_unauthorized is not None:
            params["alertWhenUnauthorized"] = alert_when_unauthorized
        if check_node_attestation is not None:
            params["checkNodeAttestation"] = check_node_attestation
        if connect_timeout is not None:
            params["connectTimeout"] = connect_timeout
        if contract_context is not None:
            params["contractContext"] = contract_context
        if debug is not None:
            params["debug"] = debug
        if default_auth_callback is not None:
            params["defaultAuthCallback"] = default_auth_callback
        if min_node_count is not None:
            params["minNodeCount"] = min_node_count
        if rpc_url is not None:
            params["rpcUrl"] = rpc_url
        if storage_provider is not None:
            params["storageProvider"] = storage_provider

        return self._post("/litNodeClient/new", params)

    def connect(self) -> Dict[str, Any]:
        """Connects to the Lit network"""
        return self._post("/litNodeClient/connect")

    def get_property(self, property_name: str) -> Dict[str, Any]:
        """Gets a property from the LitNodeClient"""
        return self._post("/litNodeClient/getProperty", {"property": property_name})

    def execute_js(self, code: str, js_params: Dict[str, Any] = None, session_sigs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Executes JavaScript code on the Lit network"""
        return self._post("/litNodeClient/executeJs", {
            "code": code,
            "jsParams": js_params or {},
            "sessionSigs": session_sigs or {}
        })

    def get_session_sigs(self, chain: str, expiration: str, resource_ability_requests: List[Any]) -> Dict[str, Any]:
        """Gets session signatures"""
        return self._post("/litNodeClient/getSessionSigs", {
            "chain": chain,
            "expiration": expiration,
            "resourceAbilityRequests": resource_ability_requests
        })

    def pkp_sign(self, pub_key: str, to_sign: List[int], session_sigs: Dict[str, Any]) -> Dict[str, Any]:
        """Signs data using a PKP"""
        return self._post("/litNodeClient/pkpSign", {
            "pubKey": pub_key,
            "toSign": to_sign,
            "sessionSigs": session_sigs
        })

    def disconnect(self) -> Dict[str, Any]:
        """Disconnects from the Lit network"""
        return self._post("/litNodeClient/disconnect")

    def new_lit_contracts_client(self, private_key: str, network: str, debug: bool = False) -> Dict[str, Any]:
        """Initializes a new LitContractsClient"""
        return self._post("/litContractsClient/new", {
            "privateKey": private_key,
            "network": network,
            "debug": debug
        })

    def mint_with_auth(self, auth_method: Dict[str, Any], scopes: List[int]) -> Dict[str, Any]:
        """Mints a new PKP with authentication"""
        if isinstance(auth_method["accessToken"], dict):
            auth_method["accessToken"] = json.dumps(auth_method["accessToken"])
        return self._post("/litContractsClient/mintWithAuth", {
            "authMethod": auth_method,
            "scopes": scopes
        })

    def create_siwe_message(self, uri: str, expiration: str, resources: List[Any], wallet_address: str) -> Dict[str, Any]:
        """Creates a SIWE message"""
        return self._post("/authHelpers/createSiweMessage", {
            "uri": uri,
            "expiration": expiration,
            "resources": resources,
            "walletAddress": wallet_address
        })

    def generate_auth_sig(self, to_sign: str) -> Dict[str, Any]:
        """Generates an auth signature"""
        return self._post("/authHelpers/generateAuthSig", {"toSign": to_sign})

    def encrypt_string(
        self,
        data_to_encrypt: str,
        access_control_conditions: Optional[List[Dict[str, Any]]] = None,
        evm_contract_conditions: Optional[List[Dict[str, Any]]] = None,
        sol_rpc_conditions: Optional[List[Dict[str, Any]]] = None,
        unified_access_control_conditions: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Encrypts a string using Lit Protocol
        
        Args:
            data_to_encrypt: The string to encrypt
            access_control_conditions: Optional list of access control conditions
            evm_contract_conditions: Optional list of EVM contract conditions
            sol_rpc_conditions: Optional list of Solana RPC conditions
            unified_access_control_conditions: Optional list of unified access control conditions
            
        Returns:
            Dict containing the encrypted data (ciphertext) and dataToEncryptHash
        """
        payload = {
            "dataToEncrypt": data_to_encrypt,
        }
        if access_control_conditions is not None:
            payload["accessControlConditions"] = access_control_conditions
        if evm_contract_conditions is not None:
            payload["evmContractConditions"] = evm_contract_conditions
        if sol_rpc_conditions is not None:
            payload["solRpcConditions"] = sol_rpc_conditions
        if unified_access_control_conditions is not None:
            payload["unifiedAccessControlConditions"] = unified_access_control_conditions

        return self._post("/litNodeClient/encryptString", payload)

    def decrypt_string(
        self,
        ciphertext: str,
        data_to_encrypt_hash: str,
        chain: str,
        access_control_conditions: Optional[List[Dict[str, Any]]] = None,
        evm_contract_conditions: Optional[List[Dict[str, Any]]] = None,
        sol_rpc_conditions: Optional[List[Dict[str, Any]]] = None,
        unified_access_control_conditions: Optional[List[Dict[str, Any]]] = None,
        auth_sig: Optional[Dict[str, Any]] = None,
        session_sigs: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Decrypts a string using Lit Protocol
        
        Args:
            ciphertext: The encrypted string to decrypt
            data_to_encrypt_hash: The hash of the original data
            chain: The blockchain network (e.g. 'ethereum')
            access_control_conditions: Optional list of access control conditions
            evm_contract_conditions: Optional list of EVM contract conditions
            sol_rpc_conditions: Optional list of Solana RPC conditions
            unified_access_control_conditions: Optional list of unified access control conditions
            auth_sig: Optional authentication signature
            session_sigs: Optional session signatures
            
        Returns:
            Dict containing the decrypted string
        """
        payload = {
            "ciphertext": ciphertext,
            "dataToEncryptHash": data_to_encrypt_hash,
            "chain": chain,
        }
        if access_control_conditions is not None:
            payload["accessControlConditions"] = access_control_conditions
        if evm_contract_conditions is not None:
            payload["evmContractConditions"] = evm_contract_conditions
        if sol_rpc_conditions is not None:
            payload["solRpcConditions"] = sol_rpc_conditions
        if unified_access_control_conditions is not None:
            payload["unifiedAccessControlConditions"] = unified_access_control_conditions
        if auth_sig is not None:
            payload["authSig"] = auth_sig
        if session_sigs is not None:
            payload["sessionSigs"] = session_sigs

        return self._post("/litNodeClient/decryptString", payload)

    def __del__(self):
        """Cleanup: Stop the Node.js server when the client is destroyed"""
        if hasattr(self, 'server') and self.server is not None:
            self.server.stop() 