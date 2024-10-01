import type { AeSdkBase, ContractMethodsBase } from "@aeternity/aepp-sdk";
import type { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import FUNGIBLE_TOKEN_FULL_ACI from "aeternity-fungible-token/generated/FungibleTokenFull.aci.json";
import type ContractWithMethods from "@aeternity/aepp-sdk/es/contract/Contract";

export async function tokenContractInstance(
  aeSdk: AeSdkBase,
  tokenContractAddress: Encoded.ContractAddress,
): Promise<ContractWithMethods<ContractMethodsBase>> {
  return aeSdk.initializeContract({
    aci: FUNGIBLE_TOKEN_FULL_ACI,
    address: tokenContractAddress,
  });
}
