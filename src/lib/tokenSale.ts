import { AeSdkBase } from "@aeternity/aepp-sdk";
import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import TOKEN_SALE_ACI from "bctsl-contracts/generated/TokenSale.aci.json";
import { SaleType, TokenSale } from "../models";
import { initAffiliationTokenGatingTokenSale } from "./bondingCurve";

export async function initTokenSale(
  aeSdk: AeSdkBase,
  address: Encoded.ContractAddress,
): Promise<{
  saleType: SaleType | string;
  instance: TokenSale;
}> {
  const contract = await aeSdk.initializeContract({
    aci: TOKEN_SALE_ACI,
    address,
  });

  const saleType = await contract.sale_type().then((res) => res.decodedResult);

  switch (saleType) {
    case SaleType.AFFILIATION_BONDING_CURVE:
      return {
        saleType: SaleType.AFFILIATION_BONDING_CURVE,
        instance: await initAffiliationTokenGatingTokenSale(aeSdk, address),
      };
    default:
      // eslint-disable-next-line no-console
      console.warn("falling back to basic token sale interface usage");
      return { saleType, instance: await initFallBack(aeSdk, address) };
  }
}

export async function initFallBack(
  aeSdk: AeSdkBase,
  address: Encoded.ContractAddress,
): Promise<TokenSale> {
  const contract = await aeSdk.initializeContract({
    aci: TOKEN_SALE_ACI,
    address,
  });

  return new TokenSale(contract, aeSdk);
}
