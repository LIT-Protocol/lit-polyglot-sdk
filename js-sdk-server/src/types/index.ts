import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';
import { ethers } from 'ethers';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import {
  LitActionResource,
  LitPKPResource,
  LitAccessControlConditionResource,
  LitRLIResource,
} from '@lit-protocol/auth-helpers';
import { LIT_ABILITY } from '@lit-protocol/constants';

export interface ResourceAbilityRequest {
  resource:
    | LitActionResource
    | LitPKPResource
    | LitAccessControlConditionResource
    | LitRLIResource;
  ability: (typeof LIT_ABILITY)[keyof typeof LIT_ABILITY];
}

export interface ResourceRequest {
  resource: {
    resourcePrefix: string;
    resource: string;
  };
  ability: (typeof LIT_ABILITY)[keyof typeof LIT_ABILITY];
}

declare module 'express' {
  interface Locals {
    litNodeClient?: LitNodeClientNodeJs;
    ethersWallet?: ethers.Wallet;
    litContractClient?: LitContracts;
  }
}
