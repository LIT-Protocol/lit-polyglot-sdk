import { Express } from 'express';
import {
  LitActionResource,
  LitPKPResource,
  LitAccessControlConditionResource,
  LitRLIResource,
  createSiweMessage,
  generateAuthSig,
} from '@lit-protocol/auth-helpers';
import { LIT_ABILITY } from '@lit-protocol/constants';
import { ResourceAbilityRequest, ResourceRequest } from './types';

export async function getSessionSigs(app: Express) {
  if (!app.locals.ethersWallet) {
    throw new Error('No Lit auth token set');
  }

  // get session sigs
  const sessionSigs = await app.locals.litNodeClient.getSessionSigs({
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
  return sessionSigs;
}

export function deserializeResourceAbilityRequests(
  resourceAbilityRequests: ResourceRequest[]
): ResourceAbilityRequest[] {
  // deserialize the resourceAbilityRequests into proper ResourceAbilityRequest objects
  return resourceAbilityRequests.map((request) => {
    switch (request.resource.resourcePrefix) {
      case 'lit-litaction':
        return {
          resource: new LitActionResource(request.resource.resource),
          ability: request.ability,
        };
      case 'lit-pkp':
        return {
          resource: new LitPKPResource(request.resource.resource),
          ability: request.ability,
        };
      case 'lit-accesscontrolcondition':
        return {
          resource: new LitAccessControlConditionResource(
            request.resource.resource
          ),
          ability: request.ability,
        };
      case 'lit-ratelimitincrease':
        return {
          resource: new LitRLIResource(request.resource.resource),
          ability: request.ability,
        };
      default:
        throw new Error(
          `Unknown resource prefix: ${request.resource.resourcePrefix}`
        );
    }
  });
}
