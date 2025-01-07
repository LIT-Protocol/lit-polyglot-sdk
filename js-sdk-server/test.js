const fetch = require('node-fetch');
require('dotenv').config({ path: '../.env' });
const ethers = require('ethers');
const { spawn } = require('child_process');
const {
  LitActionResource,
  LitPKPResource,
} = require('@lit-protocol/auth-helpers');
const {
  LIT_ABILITY,
  AuthMethodType,
  AuthMethodScope,
} = require('@lit-protocol/constants');

async function startServer() {
  console.log('Starting server in ', __dirname);
  const server = spawn('npm', ['run', 'start'], {
    cwd: __dirname,
    stdio: 'inherit',
  });
  return server;
}

async function checkIsReady() {
  try {
    const response = await fetch('http://localhost:3092/isReady', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data.ready;
  } catch (error) {
    return false;
  }
}

async function waitUntilReady(maxAttempts = 30, delayMs = 1000) {
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

async function testSetAuthToken() {
  const response = await fetch('http://localhost:3092/setAuthToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authToken: process.env.LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY,
    }),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to set auth token');
  }
}

// async function testExecuteJs() {
//   try {
//     const response = await fetch('http://localhost:3092/executeJs', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         code: `
//           (async () => {
//               console.log("This is a log");
//               Lit.Actions.setResponse({response: "Hello, World!"});
//           })()
//         `,
//         jsParams: {},
//       }),
//     });

//     const data = await response.json();
//     console.log('Response:', data);
//   } catch (error) {
//     console.error('Error:', error);
//   }
// }

// async function testCreateWallet() {
//   const response = await fetch('http://localhost:3092/createWallet', {
//     method: 'POST',
//   });
//   const data = await response.json();
//   console.log('Response:', data);

//   // this is what it should look like but we really only care about the pkp info
//   /*
//       {
//     [1]   pkp: {
//     [1]     tokenId: '0xed52da0bd105da75d1034168f6080f0064afd10fd8ecb2ab8a356170094fd27a',
//     [1]     publicKey: '04f4eb8a048d32071d1a330e6e718885f45bfa225df62f87bdecfc9b5f166f83e74422f27da5f885e460d9e729ec23dd1ebfd8135888ed1f9bd8457bae882b84ca',
//     [1]     ethAddress: '0x211D89b055b8A31a38747820B6E09D5e88C492e6'
//     [1]   },
//     [1]   tx: {
//     [1]     to: '0xCa9C62fB4ceA8831eBb6fD9fE747Cc372515CF7f',
//     [1]     from: '0x046BF7BB88E0e0941358CE3F5A765C9acddA7B9c',
//     [1]     contractAddress: null,
//     [1]     transactionIndex: 1,
//     [1]     gasUsed: { type: 'BigNumber', hex: '0x37c9e2' },
//     [1]     logsBloom: '0x00000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000010040080000000000000000020000000000000000000000040000008000000000000000000020000000000000000000000008000020000000000000000000800000000008000400000004010000000010000000800000000000010000000000000000000000004000000000000002000800000000000000000000004000000080000000000000000000080000000000000000002000040000000000000000000000000002000000000000000140060000000110000000000000000000000000000100000000000000001000000000000',
//     [1]     blockHash: '0x1be68c90e37023fea6fd030fb44f12848f391014b3ba7f3c30bc259a91cba0ee',
//     [1]     transactionHash: '0x09557bb560c57c52e8666b51b33f8cca1f160fd17f26d9c2e15b258e187eb1af',
//     [1]     logs: [
//     [1]       [Object], [Object],
//     [1]       [Object], [Object],
//     [1]       [Object], [Object],
//     [1]       [Object]
//     [1]     ],
//     [1]     blockNumber: 1151691,
//     [1]     confirmations: 1,
//     [1]     cumulativeGasUsed: { type: 'BigNumber', hex: '0x37c9e2' },
//     [1]     effectiveGasPrice: { type: 'BigNumber', hex: '0x989680' },
//     [1]     status: 1,
//     [1]     type: 2,
//     [1]     byzantium: true,
//     [1]     events: [
//     [1]       [Object], [Object],
//     [1]       [Object], [Object],
//     [1]       [Object], [Object],
//     [1]       [Object]
//     [1]     ]
//     [1]   }
//     [1] }
//     */
//   // assert the PKP info and that it's present for the test
//   const { pkp } = data;
//   if (!pkp) throw new Error('PKP info is missing');
//   // check that they are present
//   if (!pkp.tokenId) throw new Error('PKP tokenId is missing');
//   if (!pkp.publicKey) throw new Error('PKP publicKey is missing');
//   if (!pkp.ethAddress) throw new Error('PKP ethAddress is missing');

//   // check that their length is sane
//   if (pkp.tokenId.length !== 66)
//     throw new Error('PKP tokenId is not 66 characters');
//   if (pkp.publicKey.length !== 130)
//     throw new Error('PKP publicKey is not 130 characters');
//   if (pkp.ethAddress.length !== 42)
//     throw new Error('PKP ethAddress is not 42 characters');

//   return pkp;
// }

// async function testSign() {
//   const toSign = ethers.utils.keccak256(
//     ethers.utils.toUtf8Bytes('The answer to the universe is 42.')
//   );
//   const response = await fetch('http://localhost:3092/sign', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({ toSign }),
//   });

//   const data = await response.json();

//   console.log('Response:', data);
// }

async function testLitNodeClientNew() {
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
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to create new LitNodeClient');
  }
}

async function testLitNodeClientConnect() {
  const response = await fetch('http://localhost:3092/litNodeClient/connect', {
    method: 'POST',
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to connect LitNodeClient');
  }
}

async function testLitNodeClientGetProperty() {
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
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to get LitNodeClient property');
  }
  console.log('returned data:', data);
  if (typeof data.property !== 'boolean') {
    throw new Error('Invalid property value returned');
  }
}

async function testLitNodeClientExecuteJs() {
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
  const { success, sessionSigs } = await sessionSigsResponse.json();
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
  const data = await response.json();
  if (!data.response) {
    throw new Error('Failed to execute JS on LitNodeClient');
  }
  if (data.response !== 'Test successful') {
    throw new Error('Invalid response from executeJs endpoint');
  }
}

async function testLitNodeClientPkpSign(pkp) {
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
  const { success, sessionSigs } = await sessionSigsResponse.json();
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
  const data = await response.json();
  if (!data.signature) {
    throw new Error('Failed to sign with PKP');
  }
}

async function testLitContractsClientNew() {
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
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to create new LitContractsClient');
  }
}

async function testLitContractsClientMintWithAuth() {
  const wallet = new ethers.Wallet(
    process.env.LIT_POLYGLOT_SDK_TEST_PRIVATE_KEY
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
  createSiweMessageResponse = await createSiweMessageResponse.json();
  if (!createSiweMessageResponse.success) {
    throw new Error('Failed to create SIWE message');
  }
  const { siweMessage } = createSiweMessageResponse;

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
  let { success, authSig } = await authSigResponse.json();
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
  const data = await response.json();
  if (!data.pkp || !data.tx) {
    throw new Error('Failed to mint with auth');
  }
  return data.pkp;
}

async function testLitNodeClientDisconnect() {
  const response = await fetch(
    'http://localhost:3092/litNodeClient/disconnect',
    {
      method: 'POST',
    }
  );
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to disconnect LitNodeClient');
  }
}

// Run the test with readiness check
async function runTest() {
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
