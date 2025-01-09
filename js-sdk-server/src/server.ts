import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';
import {
  LitNetwork,
  LIT_RPC,
  AuthMethodScope,
  AuthMethodType,
  ProviderType,
  LIT_ABILITY,
  LIT_NETWORKS,
  LIT_NETWORK,
} from '@lit-protocol/constants';
import { ethers } from 'ethers';
import {
  LitActionResource,
  LitPKPResource,
  createSiweMessage,
  generateAuthSig,
} from '@lit-protocol/auth-helpers';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { getSessionSigs, deserializeResourceAbilityRequests } from './utils';
import LocalStorage from 'localstorage-memory';
import { ResourceAbilityRequest } from './types';

// Declare localStorage if it doesn't exist
declare global {
  var localStorage: typeof LocalStorage;
}
if (typeof localStorage === 'undefined' || localStorage === null) {
  global.localStorage = LocalStorage;
}

// Types for request bodies
interface LitNodeClientNewRequest {
  litNetwork?: keyof typeof LIT_NETWORKS;
  debug?: boolean;
}

interface GetPropertyRequest {
  property: string;
}

interface GetSessionSigsRequest {
  chain: string;
  expiration: string;
  resourceAbilityRequests: ResourceAbilityRequest[];
}

interface ExecuteJsRequest {
  authMethods?: any[];
  code: string;
  ipfsId?: string;
  ipfsOptions?: any;
  jsParams?: any;
  responseStrategy?: string;
  sessionSigs?: any;
  useSingleNode?: boolean;
}

interface PkpSignRequest {
  authMethods?: any[];
  pubKey: string;
  sessionSigs: any;
  toSign: number[];
}

interface LitContractsClientNewRequest {
  privateKey: string;
  litNodeClient?: any;
  network: keyof typeof LIT_NETWORKS;
  debug?: boolean;
}

interface MintWithAuthRequest {
  authMethod: {
    authMethodType: (typeof AuthMethodType)[keyof typeof AuthMethodType];
    accessToken: string;
  };
  scopes: (typeof AuthMethodScope)[keyof typeof AuthMethodScope][];
}

interface SetAuthTokenRequest {
  authToken: string;
}

interface CreateSiweMessageRequest {
  uri: string;
  expiration: string;
  resources: ResourceAbilityRequest[];
  walletAddress: string;
}

interface GenerateAuthSigRequest {
  toSign: string;
}

// Utility function to wrap async route handlers
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };

const app = express();
const port = 3092;

// Middleware
app.use(bodyParser.json());

// Enable CORS for localhost development
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

// Create a new LitNodeClient
app.post(
  '/litNodeClient/new',
  asyncHandler(
    async (req: Request<{}, {}, LitNodeClientNewRequest>, res: Response) => {
      app.locals.litNodeClient = new LitNodeClientNodeJs({
        litNetwork: (req.body.litNetwork ||
          'datil-dev') as keyof typeof LIT_NETWORKS,
        debug: req.body.debug,
      });

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
    }
  )
);

// Connect to the LitNodeClient
app.post(
  '/litNodeClient/connect',
  asyncHandler(async (req: Request, res: Response) => {
    if (!app.locals.litNodeClient) {
      return res.status(400).json({
        success: false,
        error: 'LitNodeClient not initialized',
      });
    }
    await app.locals.litNodeClient.connect();
    res.json({ success: true });
  })
);

// Disconnect from the LitNodeClient
app.post('/litNodeClient/disconnect', (req: Request, res: Response) => {
  if (app.locals.litNodeClient) {
    app.locals.litNodeClient.disconnect();
  }
  res.json({ success: true });
});

// Get a property from the LitNodeClient
app.post(
  '/litNodeClient/getProperty',
  asyncHandler(
    async (req: Request<{}, {}, GetPropertyRequest>, res: Response) => {
      const { property } = req.body;
      if (!app.locals.litNodeClient) {
        return res.status(400).json({
          success: false,
          error: 'LitNodeClient not initialized',
        });
      }
      res.json({
        success: true,
        property:
          app.locals.litNodeClient[property as keyof LitNodeClientNodeJs],
      });
    }
  )
);

app.post(
  '/litNodeClient/getSessionSigs',
  asyncHandler(
    async (req: Request<{}, {}, GetSessionSigsRequest>, res: Response) => {
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
        }: {
          uri: string;
          expiration: string;
          resourceAbilityRequests: ResourceAbilityRequest[];
        }) => {
          const toSign = await createSiweMessage({
            uri,
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: await app.locals.ethersWallet!.getAddress(),
            nonce: await app.locals.litNodeClient!.getLatestBlockhash(),
            litNodeClient: app.locals.litNodeClient,
          });

          return await generateAuthSig({
            signer: app.locals.ethersWallet!,
            toSign,
          });
        },
      });

      res.json({ success: true, sessionSigs });
    }
  )
);

// Execute JavaScript code on the LitNodeClient
app.post(
  '/litNodeClient/executeJs',
  asyncHandler(
    async (req: Request<{}, {}, ExecuteJsRequest>, res: Response) => {
      if (!app.locals.litNodeClient) {
        return res.status(400).json({
          success: false,
          error: 'LitNodeClient not initialized',
        });
      }

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
    }
  )
);

// Sign something using a PKP
app.post(
  '/litNodeClient/pkpSign',
  asyncHandler(async (req: Request<{}, {}, PkpSignRequest>, res: Response) => {
    if (!app.locals.litNodeClient) {
      return res.status(400).json({
        success: false,
        error: 'LitNodeClient not initialized',
      });
    }

    const { authMethods, pubKey, sessionSigs, toSign } = req.body;
    console.log('req.body for pkpSign', req.body);
    const signingResult = await app.locals.litNodeClient.pkpSign({
      authMethods,
      pubKey,
      sessionSigs,
      toSign,
    });
    res.json({ signature: signingResult });
  })
);

// Create a new LitContracts client
app.post(
  '/litContractsClient/new',
  asyncHandler(
    async (
      req: Request<{}, {}, LitContractsClientNewRequest>,
      res: Response
    ) => {
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
    }
  )
);

// Mint a new PKP with an auth method
app.post(
  '/litContractsClient/mintWithAuth',
  asyncHandler(
    async (req: Request<{}, {}, MintWithAuthRequest>, res: Response) => {
      if (!app.locals.litContractClient) {
        return res.status(400).json({
          success: false,
          error: 'LitContractsClient not initialized',
        });
      }

      const { authMethod, scopes } = req.body;
      console.log('req.body for mintWithAuth', req.body);
      const mintInfo = await app.locals.litContractClient.mintWithAuth({
        authMethod,
        scopes,
      });
      res.json(mintInfo);
    }
  )
);

app.post(
  '/authHelpers/createSiweMessage',
  asyncHandler(
    async (req: Request<{}, {}, CreateSiweMessageRequest>, res: Response) => {
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
    }
  )
);

app.post(
  '/authHelpers/generateAuthSig',
  asyncHandler(
    async (req: Request<{}, {}, GenerateAuthSigRequest>, res: Response) => {
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
    }
  )
);

// set the wallet used to talk to the Lit Nodes
app.post(
  '/setAuthToken',
  asyncHandler(
    async (req: Request<{}, {}, SetAuthTokenRequest>, res: Response) => {
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
    }
  )
);

// Health check endpoint
app.post('/isReady', (req: Request, res: Response) => {
  try {
    res.json({
      ready: app.locals.litNodeClient.ready,
    });
  } catch (error) {
    res.status(500).json({
      ready: false,
      error,
    });
  }
});

// Error-handling middleware
app.use(
  (
    error: Error & { status?: number },
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.error(error.message);
    console.error(error.stack);
    if (res.headersSent) {
      return next(error);
    }
    res.status(error.status || 500);
    res.send({
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
);

app.listen(port, async () => {
  app.locals.litNodeClient = new LitNodeClientNodeJs({
    litNetwork: LIT_NETWORK.DatilDev,
  });
  await app.locals.litNodeClient.connect();
  console.log(`Server is running at http://localhost:${port}`);
});
