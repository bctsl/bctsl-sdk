import { Contract } from "@aeternity/aepp-sdk";
import type {
  AeSdkBase,
  Contract as ContractWithMethods,
  ContractMethodsBase,
  Encoded,
} from "@aeternity/aepp-sdk";
import FUNGIBLE_TOKEN_FULL_ACI from "aeternity-fungible-token/generated/FungibleTokenFull.aci.json";

export async function tokenContractInstance(
  aeSdk: AeSdkBase,
  tokenContractAddress: Encoded.ContractAddress,
): Promise<ContractWithMethods<ContractMethodsBase>> {
  return Contract.initialize({
    ...aeSdk.getContext(),
    aci: FUNGIBLE_TOKEN_FULL_ACI,
    address: tokenContractAddress,
  });
}
