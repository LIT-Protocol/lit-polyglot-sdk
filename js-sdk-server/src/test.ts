import fetch from 'node-fetch';
import { config } from 'dotenv';
import { ethers } from 'ethers';
import { spawn, ChildProcess, execSync } from 'child_process';
import { LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import {
  LIT_ABILITY,
  AuthMethodType,
  AuthMethodScope,
} from '@lit-protocol/constants';

config({ path: '../.env' });

interface PKPInfo {
  tokenId: string;
  publicKey: string;
  ethAddress: string;
}

interface SessionSigsResponse {
  success: boolean;
  sessionSigs: any; // TODO: Add proper type from Lit Protocol
}

interface ApiResponse<T = any> {
  success: boolean;
  response?: string;
  property?: boolean;
  signature?: string;
  pkp?: PKPInfo;
  tx?: any;
  [key: string]: any;
}

async function startServer(): Promise<ChildProcess> {
  console.log('Starting server in ', __dirname);
  // Kill any existing server process
  try {
    execSync('pkill -f "tsx src/server.ts"', {
      stdio: 'inherit',
    });
  } catch (error) {
    // Ignore error if process is not already running
  }
  const server = spawn('npm', ['run', 'start'], {
    cwd: __dirname,
    stdio: 'inherit',
  });
  return server;
}

async function checkIsReady(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3092/isReady', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = (await response.json()) as ApiResponse;
    console.log('data ready response: ', data);
    return data.ready;
  } catch (error) {
    return false;
  }
}

async function waitUntilReady(
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    console.log(
      `Checking if server is ready (attempt ${i + 1}/${maxAttempts})...`
    );
    const isReady = await checkIsReady();
    if (isReady) {
      console.log('Server is ready!');
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error('Server failed to become ready in time');
}

async function testSetAuthToken(): Promise<void> {
  const response = await fetch('http://localhost:3092/setAuthToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authToken: process.env.LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY,
    }),
  });
  const data = (await response.json()) as ApiResponse;
  if (!data.success) {
    console.log('data', data);
    throw new Error('Failed to set auth token');
  }
}

async function testLitNodeClientNew(): Promise<void> {
  const response = await fetch('http://localhost:3092/litNodeClient/new', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      litNetwork: 'datil-test',
      debug: true,
    }),
  });
  const data = (await response.json()) as ApiResponse;
  if (!data.success) {
    throw new Error('Failed to create new LitNodeClient');
  }
}

async function testLitNodeClientConnect(): Promise<void> {
  const response = await fetch('http://localhost:3092/litNodeClient/connect', {
    method: 'POST',
  });
  const data = (await response.json()) as ApiResponse;
  if (!data.success) {
    throw new Error('Failed to connect LitNodeClient');
  }
}

async function testLitNodeClientGetProperty(): Promise<void> {
  const response = await fetch(
    'http://localhost:3092/litNodeClient/getProperty',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        property: 'ready',
      }),
    }
  );
  const data = (await response.json()) as ApiResponse;
  if (!data.success) {
    throw new Error('Failed to get LitNodeClient property');
  }
  console.log('returned data:', data);
  if (typeof data.property !== 'boolean') {
    throw new Error('Invalid property value returned');
  }
}

async function testLitNodeClientExecuteJs(): Promise<void> {
  // get session sigs first
  const sessionSigsResponse = await fetch(
    'http://localhost:3092/litNodeClient/getSessionSigs',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chain: 'ethereum',
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        resourceAbilityRequests: [
          {
            resource: new LitActionResource('*'),
            ability: LIT_ABILITY.LitActionExecution,
          },
          {
            resource: new LitPKPResource('*'),
            ability: LIT_ABILITY.PKPSigning,
          },
        ],
      }),
    }
  );
  const { success, sessionSigs } =
    (await sessionSigsResponse.json()) as SessionSigsResponse;
  if (!success) {
    throw new Error('Failed to get session sigs');
  }
  if (!sessionSigs || sessionSigs.length === 0) {
    throw new Error('No session sigs returned');
  }

  const response = await fetch(
    'http://localhost:3092/litNodeClient/executeJs',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: `
        (async () => {
          console.log("Testing executeJs endpoint");
          Lit.Actions.setResponse({response: "Test successful"});
        })()
      `,
        jsParams: {},
        sessionSigs,
      }),
    }
  );
  const data = (await response.json()) as ApiResponse;
  if (!data.response) {
    throw new Error('Failed to execute JS on LitNodeClient');
  }
  if (data.response !== 'Test successful') {
    throw new Error('Invalid response from executeJs endpoint');
  }
}

async function testLitNodeClientPkpSign(pkp: PKPInfo): Promise<void> {
  console.log('pkp in testLitNodeClientPkpSign', pkp);
  const toSign = Array.from(
    ethers.utils.arrayify(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Test message'))
    )
  );

  // get session sigs first
  const sessionSigsResponse = await fetch(
    'http://localhost:3092/litNodeClient/getSessionSigs',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chain: 'ethereum',
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        resourceAbilityRequests: [
          {
            resource: new LitActionResource('*'),
            ability: LIT_ABILITY.LitActionExecution,
          },
          {
            resource: new LitPKPResource('*'),
            ability: LIT_ABILITY.PKPSigning,
          },
        ],
      }),
    }
  );
  const { success, sessionSigs } =
    (await sessionSigsResponse.json()) as SessionSigsResponse;
  if (!success) {
    throw new Error('Failed to get session sigs');
  }
  if (!sessionSigs || sessionSigs.length === 0) {
    throw new Error('No session sigs returned');
  }

  const response = await fetch('http://localhost:3092/litNodeClient/pkpSign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pubKey: pkp.publicKey,
      toSign,
      sessionSigs,
    }),
  });
  const data = (await response.json()) as ApiResponse;
  if (!data.signature) {
    throw new Error('Failed to sign with PKP');
  }
}

async function testLitContractsClientNew(): Promise<void> {
  const response = await fetch('http://localhost:3092/litContractsClient/new', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      privateKey: process.env.LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY,
      network: 'datil-test',
      debug: true,
    }),
  });
  const data = (await response.json()) as ApiResponse;
  if (!data.success) {
    throw new Error('Failed to create new LitContractsClient');
  }
}

async function testLitContractsClientMintWithAuth(): Promise<PKPInfo> {
  const wallet = new ethers.Wallet(
    process.env.LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY as string
  );

  let createSiweMessageResponse = await fetch(
    'http://localhost:3092/authHelpers/createSiweMessage',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uri: 'http://localhost:3092',
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        resources: [
          {
            resource: new LitActionResource('*'),
            ability: LIT_ABILITY.LitActionExecution,
          },
          {
            resource: new LitPKPResource('*'),
            ability: LIT_ABILITY.PKPSigning,
          },
        ],
        walletAddress: wallet.address,
      }),
    }
  );
  const siweResponse = (await createSiweMessageResponse.json()) as ApiResponse;
  if (!siweResponse.success) {
    throw new Error('Failed to create SIWE message');
  }
  const { siweMessage } = siweResponse;

  const authSigResponse = await fetch(
    'http://localhost:3092/authHelpers/generateAuthSig',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ toSign: siweMessage }),
    }
  );
  const { success, authSig } = (await authSigResponse.json()) as ApiResponse;
  if (!success) {
    throw new Error('Failed to generate auth sig');
  }

  const authMethod = {
    authMethodType: AuthMethodType.EthWallet,
    accessToken: JSON.stringify(authSig),
  };

  const response = await fetch(
    'http://localhost:3092/litContractsClient/mintWithAuth',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authMethod,
        scopes: [AuthMethodScope.SignAnything],
      }),
    }
  );
  const data = (await response.json()) as ApiResponse;
  if (!data.pkp || !data.tx) {
    throw new Error('Failed to mint with auth');
  }

  // assert the PKP info and that it's present for the test
  const { pkp } = data;
  if (!pkp) throw new Error('PKP info is missing');
  // check that they are present
  if (!pkp.tokenId) throw new Error('PKP tokenId is missing');
  if (!pkp.publicKey) throw new Error('PKP publicKey is missing');
  if (!pkp.ethAddress) throw new Error('PKP ethAddress is missing');

  // check that their length is sane
  if (pkp.tokenId.length !== 66)
    throw new Error('PKP tokenId is not 66 characters');
  if (pkp.publicKey.length !== 130)
    throw new Error('PKP publicKey is not 130 characters');
  if (pkp.ethAddress.length !== 42)
    throw new Error('PKP ethAddress is not 42 characters');

  return pkp;
}

async function testLitNodeClientDisconnect(): Promise<void> {
  const response = await fetch(
    'http://localhost:3092/litNodeClient/disconnect',
    {
      method: 'POST',
    }
  );
  const data = (await response.json()) as ApiResponse;
  if (!data.success) {
    throw new Error('Failed to disconnect LitNodeClient');
  }
}

// Run the test with readiness check
async function runTest(): Promise<void> {
  const serverHandle = await startServer();
  try {
    await waitUntilReady();
    await testSetAuthToken();

    // New endpoint tests
    await testLitNodeClientNew();
    await testLitNodeClientConnect();
    await testLitNodeClientGetProperty();
    await testLitContractsClientNew();

    // Tests that require authentication
    await testLitNodeClientExecuteJs();
    const pkp = await testLitContractsClientMintWithAuth();
    await testLitNodeClientPkpSign(pkp);

    // Cleanup
    await testLitNodeClientDisconnect();

    console.log('All tests passed!');
    serverHandle.kill();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    if (serverHandle) {
      serverHandle.kill();
    }
    process.exit(1);
  }
}

runTest();
