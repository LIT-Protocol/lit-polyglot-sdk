# Lit Protocol JS SDK Server

This Express server acts as a bridge between the Lit Protocol JS SDK and the Go/Python SDKs. It runs locally and provides an HTTP interface that allows the Go and Python SDKs to interact with the Lit Protocol JS SDK functionality.

## Overview

The js-sdk-server is a crucial component that enables non-JavaScript languages to utilize the Lit Protocol JS SDK. It runs as a local HTTP server that the Go and Python SDKs communicate with to perform Lit Protocol operations.

## Development

### Prerequisites

- Node.js (v14 or higher recommended)
- npm

### Installation

```bash
npm install
```

### Running the Server

For development:

```bash
npm run dev
```

This will start the server in watch mode, automatically rebuilding when changes are detected. The bundled server will be automatically updated in both the Python and Go SDK directories.

For production:

```bash
npm start
```

### Building

To build the bundled server for both Python and Go SDKs:

```bash
npm run build
```

### Testing

To run the test suite:

```bash
npm test
```

## Architecture

The server exposes HTTP endpoints that the Go and Python SDKs use to communicate with the Lit Protocol JS SDK. This architecture allows these languages to leverage the full capabilities of the JS SDK while maintaining their native language interfaces.
