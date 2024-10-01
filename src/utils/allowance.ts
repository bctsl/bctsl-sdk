import type { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import type { AeSdkBase, ContractMethodsBase } from "@aeternity/aepp-sdk";
import type ContractWithMethods from "@aeternity/aepp-sdk/es/contract/Contract";
import { BigNumber } from "bignumber.js";

export async function createOrChangeAllowance(
  aeSdk: AeSdkBase,
  tokenContract: ContractWithMethods<ContractMethodsBase>,
  forAccount: Encoded.AccountAddress,
  countTokenDecimals: string,
): Promise<void> {
  const allowance = await tokenContract
    .allowance({
      from_account: aeSdk.address,
      for_account: forAccount,
    })
    .then((res) => res.decodedResult);

  await (allowance === undefined
    ? tokenContract.create_allowance(forAccount, countTokenDecimals)
    : tokenContract.change_allowance(
        forAccount,
        new BigNumber(countTokenDecimals).minus(allowance).toFixed(),
      ));
}
