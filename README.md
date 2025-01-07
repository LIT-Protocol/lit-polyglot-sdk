# Experimental Lit Polyglot SDK Monorepo

This monorepo contains the Lit Polyglot SDK for Python and Go. These are wrapper SDKs around the Lit JS SDK. This project is an experimental work in progress and is not yet ready for production use.

## Python SDK

The [Python SDK](./python/README.md) is a wrapper around the Lit JS SDK.

## Go SDK

The [Go SDK](./go/lit_go_sdk/README.md) is a wrapper around the Lit JS SDK.

## Supported Features

- Lit Action Execution. Run JS code in a Lit Action, which will run across the Lit Nodes in a TEE.
- Lit Wallet / PKP Creation. Create a Lit Wallet (Aka a PKP), which is a threshold key that lives across the Lit Nodes.
- Lit Signing. Sign a message with a Lit Wallet PKP.

Don't see a feature you need? [Join the community](https://developer.litprotocol.com/support/intro) and let us know!

## Authentication

Currently, the SDKs are authenticated with an "auth token" which is a private key that holds Lit tokens on the Chronicle L3 blockchain. This is used to pay for requests to the Lit Nodes. If you create a wallet / PKP, this key will own it. To the Lit Nodes, these SDKs appear as a single user identified by that auth token.

To manage user funds and PKPs, you will need to either set up some kind of delegation system, or figure out how to pass your user auth through to the SDK and the Lit Nodes. This is because typically, users interact with Lit via the JS SDK from a browser. Since Python and Go are typically run on servers, the direct "user to Lit Node" communication is not possible, and must pass through your server, which would therefore have the user's auth material. An end-to-end encryption solution is possible to implement as a user building on Lit, but there is no current reference implementation.

## ENV Variables

- `LIT_DEBUG_JS_SDK_SERVER`: Set to `true` to enable logging of the JS SDK server.

## How it works

We run a localhost Node.js server that is used to interact with the Lit JS SDK. The server is started when the Python or Go SDK is initialized, and they talk to it over HTTP. The server is stopped when the Python or Go SDK is shutdown. The server is restarted if it crashes.

The [js-sdk-server](./js-sdk-server/README.md) is a Node.js server that is used to interact with the Lit JS SDK. It is bundled into the Python and Go SDKs.

## Contributing

We welcome contributions to this project. To get in contact, please [join the community](https://developer.litprotocol.com/support/intro).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Known development issues

When running the tests on CI, all the tests share the same Lit Auth token which is a wallet. This wallet makes transactions on the Chronicle L3 Blockchain. Since the JS and Python tests run in parallel, you can run into nonce issues where a nonce was already used. This is a race condition and re-running the tests usually fixes it.
