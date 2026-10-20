import { AeSdkBase, Contract, Encoded } from "@aeternity/aepp-sdk";
import AFFILIATION_BONDING_CURVE_TOKEN_SALE_CONTRACT_ACI from "bctsl-contracts/generated/AffiliationBondingCurveTokenSale.aci.json";
import { BondingCurveTokenSale } from "../models";
import {
  CommunityFactoryNameChars,
  Denomination,
  initCommunityFactory,
} from "../utils";
import { CreateCommunityOptions } from "../interfaces";

export async function createCollection(
  aeSdk: AeSdkBase,
  name: string,
  allowedNameLength: bigint,
  allowedNameChars: CommunityFactoryNameChars,
  communityFactoryAddress?: Encoded.ContractAddress,
): Promise<string> {
  const communityFactory = await initCommunityFactory(
    aeSdk,
    communityFactoryAddress,
  );

  return communityFactory.createCollection(
    name,
    allowedNameLength,
    allowedNameChars,
  );
}

export async function createCommunity(
  aeSdk: AeSdkBase,
  collectionName: string,
  options: CreateCommunityOptions,
  denomination?: Denomination,
  communityFactoryAddress?: Encoded.ContractAddress,
): Promise<BondingCurveTokenSale> {
  const communityFactory = await initCommunityFactory(
    aeSdk,
    communityFactoryAddress,
  );

  return communityFactory.createCommunity(
    collectionName,
    options.token.name,
    options.metaInfo,
    options.initialBuyCount,
    denomination,
  );
}

export async function initAffiliationTokenGatingTokenSale(
  aeSdk: AeSdkBase,
  address: Encoded.ContractAddress,
): Promise<BondingCurveTokenSale> {
  const contract = await Contract.initialize({
    ...aeSdk.getContext(),
    aci: AFFILIATION_BONDING_CURVE_TOKEN_SALE_CONTRACT_ACI,
    address,
  });

  return new BondingCurveTokenSale(contract, aeSdk);
}
