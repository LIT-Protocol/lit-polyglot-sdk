const express = require('express');
const bodyParser = require('body-parser');
const LitJsSdk = require('@lit-protocol/lit-node-client-nodejs');
const {
  LitNetwork,
  LIT_RPC,
  AuthMethodScope,
  AuthMethodType,
  ProviderType,
  LIT_ABILITY,
} = require('@lit-protocol/constants');
const ethers = require('ethers');
const {
  LitActionResource,
  LitPKPResource,
  createSiweMessage,
  generateAuthSig,
} = require('@lit-protocol/auth-helpers');
const { LitContracts } = require('@lit-protocol/contracts-sdk');
const {
  getSessionSigs,
  deserializeResourceAbilityRequests,
} = require('./utils');
if (typeof localStorage === 'undefined' || localStorage === null) {
  var LocalStorage = require('localstorage-memory');
  localStorage = LocalStorage;
}

const app = express();
const port = 3092;

// Middleware
app.use(bodyParser.json());

// Enable CORS for localhost development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

// Create a new LitNodeClient
app.post('/litNodeClient/new', async (req, res) => {
  app.locals.litNodeClient = new LitJsSdk.LitNodeClientNodeJs(req.body);

  await app.locals.litNodeClient.connect();

  if (app.locals.litContractClient) {
    // create a new lit contracts client with this same config
    app.locals.litContractClient = new LitContracts({
      signer: app.locals.ethersWallet,
      network: app.locals.litNodeClient.config.litNetwork,
      debug: true,
    });
    await app.locals.litContractClient.connect();
  }

  res.json({ success: true });
});

// Connect to the LitNodeClient
app.post('/litNodeClient/connect', async (req, res) => {
  if (!app.locals.litNodeClient) {
    return res.status(400).json({
      success: false,
      error: 'LitNodeClient not initialized',
    });
  }
  await app.locals.litNodeClient.connect();
  res.json({ success: true });
});

// Disconnect from the LitNodeClient
app.post('/litNodeClient/disconnect', (req, res) => {
  app.locals.litNodeClient.disconnect();
  res.json({ success: true });
});

// Get a property from the LitNodeClient
app.post('/litNodeClient/getProperty', (req, res) => {
  const { property } = req.body;
  res.json({ success: true, property: app.locals.litNodeClient[property] });
});

app.post('/litNodeClient/getSessionSigs', async (req, res) => {
  if (!app.locals.litNodeClient) {
    return res.status(400).json({
      success: false,
      error: 'LitNodeClient not initialized',
    });
  }
  if (!app.locals.ethersWallet) {
    return res.status(400).json({
      success: false,
      error: 'Ethers wallet not initialized - Please set a Lit auth token.',
    });
  }

  console.log('req.body for getSessionSigs', req.body);

  let { chain, expiration, resourceAbilityRequests } = req.body;

  console.log('incoming resourceAbilityRequests', resourceAbilityRequests);

  resourceAbilityRequests = deserializeResourceAbilityRequests(
    resourceAbilityRequests
  );

  const sessionSigs = await app.locals.litNodeClient.getSessionSigs({
    chain,
    expiration,
    resourceAbilityRequests,
    authNeededCallback: async ({
      uri,
      expiration,
      resourceAbilityRequests,
    }) => {
      const toSign = await createSiweMessage({
        uri,
        expiration,
        resources: resourceAbilityRequests,
        walletAddress: await app.locals.ethersWallet.getAddress(),
        nonce: await app.locals.litNodeClient.getLatestBlockhash(),
        litNodeClient: app.locals.litNodeClient,
      });

      return await generateAuthSig({
        signer: app.locals.ethersWallet,
        toSign,
      });
    },
  });

  res.json({ success: true, sessionSigs });
});

// Execute JavaScript code on the LitNodeClient
app.post('/litNodeClient/executeJs', async (req, res) => {
  const {
    authMethods,
    code,
    ipfsId,
    ipfsOptions,
    jsParams,
    responseStrategy,
    sessionSigs,
    useSingleNode,
  } = req.body;

  const response = await app.locals.litNodeClient.executeJs({
    authMethods,
    code,
    ipfsId,
    ipfsOptions,
    jsParams,
    responseStrategy,
    sessionSigs,
    useSingleNode,
  });
  res.json(response);
});

// Sign something using a PKP
app.post('/litNodeClient/pkpSign', async (req, res) => {
  const { authMethods, pubKey, sessionSigs, toSign } = req.body;
  console.log('req.body for pkpSign', req.body);
  const signingResult = await app.locals.litNodeClient.pkpSign({
    authMethods,
    pubKey,
    sessionSigs,
    toSign,
  });
  res.json({ signature: signingResult });
});

// Create a new LitContracts client
app.post('/litContractsClient/new', async (req, res) => {
  const { privateKey, litNodeClient, network, debug } = req.body;
  app.locals.ethersWallet = new ethers.Wallet(
    privateKey,
    new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
  );
  app.locals.litContractClient = new LitContracts({
    signer: app.locals.ethersWallet,
    network,
    debug,
  });
  await app.locals.litContractClient.connect();
  res.json({ success: true });
});

// Mint a new PKP with an auth method
app.post('/litContractsClient/mintWithAuth', async (req, res) => {
  const { authMethod, scopes } = req.body;
  console.log('req.body for mintWithAuth', req.body);
  const mintInfo = await app.locals.litContractClient.mintWithAuth({
    authMethod,
    scopes,
  });
  res.json(mintInfo);
});

// set the wallet used to talk to the Lit Nodes
app.post('/setAuthToken', async (req, res) => {
  if (!app.locals.litNodeClient) {
    return res.status(400).json({
      success: false,
      error: 'LitNodeClient not initialized',
    });
  }
  const { authToken } = req.body;
  app.locals.ethersWallet = new ethers.Wallet(
    authToken,
    new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
  );
  app.locals.litContractClient = new LitContracts({
    signer: app.locals.ethersWallet,
    network: app.locals.litNodeClient.config.litNetwork,
    debug: true,
  });
  await app.locals.litContractClient.connect();
  res.json({ success: true });
});

// Check if the LitNodeClient is ready
app.post('/isReady', (req, res) => {
  try {
    res.json({
      ready: app.locals.litNodeClient.ready,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/authHelpers/createSiweMessage', async (req, res) => {
  if (!app.locals.litNodeClient) {
    return res.status(400).json({
      success: false,
      error: 'LitNodeClient not initialized',
    });
  }
  console.log('req.body for createSiweMessage', req.body);
  let { uri, expiration, resources, walletAddress } = req.body;
  resources = deserializeResourceAbilityRequests(resources);
  const nonce = await app.locals.litNodeClient.getLatestBlockhash();
  const siweMessage = await createSiweMessage({
    uri,
    expiration,
    resources,
    walletAddress,
    nonce,
    litNodeClient: app.locals.litNodeClient,
  });
  res.json({ success: true, siweMessage });
});

app.post('/authHelpers/generateAuthSig', async (req, res) => {
  if (!app.locals.ethersWallet) {
    return res.status(400).json({
      success: false,
      error: 'Ethers wallet not initialized',
    });
  }
  const { toSign } = req.body;
  const authSig = await generateAuthSig({
    signer: app.locals.ethersWallet,
    toSign,
  });
  res.json({ success: true, authSig });
});

// Basic health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start the server
app.listen(port, async () => {
  app.locals.litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
    litNetwork: LitNetwork.DatilDev,
  });
  await app.locals.litNodeClient.connect();

  console.log(`Server running at http://localhost:${port}`);
});
