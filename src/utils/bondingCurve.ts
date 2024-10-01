import { AeSdkBase, Contract, ContractMethodsBase } from "@aeternity/aepp-sdk";
import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import BONDING_CURVE_EXPONENTIAL_CONTRACT_ACI from "bctsl-contracts/generated/BondingCurveExponential.aci.json";
import {
  Denomination,
  denominationTokenDecimals,
  toTokenDecimals,
} from "./denomination";
import BONDING_CURVE_ACI from "bctsl-contracts/generated/BondingCurve.aci.json";
import { CurveType } from "../models";
import { BigNumber } from "bignumber.js";

export async function estimateInitialBuyPriceAetto(
  aeSdk: AeSdkBase,
  count: bigint | string | number,
  bondingCurveAddress: Encoded.ContractAddress,
  denomination?: Denomination,
  fee?: number,
): Promise<string> {
  const contract = await aeSdk.initializeContract({
    address: bondingCurveAddress,
    aci: BONDING_CURVE_ACI,
  });

  const decimals = await contract
    .supported_decimals()
    .then((res) => res.decodedResult);

  const countTokenDecimals = toTokenDecimals(
    count,
    denominationTokenDecimals(denomination),
    decimals,
  );

  const priceAetto = await contract
    .calculate_buy_price(0, countTokenDecimals)
    .then((res) => res.decodedResult as bigint);

  const priceAettoWithFee = fee
    ? new BigNumber(priceAetto.toString())
        .multipliedBy(fee)
        .plus(priceAetto.toString())
        .toFixed(0, BigNumber.ROUND_CEIL)
    : priceAetto.toString();

  return priceAettoWithFee;
}

export async function initBondingCurveContract(
  aeSdk: AeSdkBase,
  address: Encoded.ContractAddress,
): Promise<{ instance: Contract<ContractMethodsBase>; type: CurveType }> {
  const contract = await aeSdk.initializeContract({
    aci: BONDING_CURVE_ACI,
    address,
  });

  const { type, aci } = await contract.curve_type().then((res) => {
    switch (res.decodedResult as CurveType) {
      case CurveType.TAYLOR_EXPONENTIAL_V1:
        return {
          type: res.decodedResult as CurveType,
          aci: BONDING_CURVE_EXPONENTIAL_CONTRACT_ACI,
        };

      default:
        throw new Error(
          `bondingCurveContract for CurveType ${res.decodedResult} is not implemented`,
        );
    }
  });

  return {
    type,
    instance: await aeSdk.initializeContract({
      aci,
      address,
    }),
  };
}
