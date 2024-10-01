import { AE_AMOUNT_FORMATS } from "@aeternity/aepp-sdk";
import BigNumber from "bignumber.js";

export enum TOKEN_AMOUNT_FORMATS {
  FULL = "full",
  MILLI = "milli",
  MICRO = "micro",
  NANO = "nano",
  PICO = "pico",
  FEMTO = "femto",
  ATTO = "atto",
}

export const TOKEN_DENOMINATION_MAGNITUDE = {
  [TOKEN_AMOUNT_FORMATS.FULL]: 0,
  [TOKEN_AMOUNT_FORMATS.MILLI]: -3,
  [TOKEN_AMOUNT_FORMATS.MICRO]: -6,
  [TOKEN_AMOUNT_FORMATS.NANO]: -9,
  [TOKEN_AMOUNT_FORMATS.PICO]: -12,
  [TOKEN_AMOUNT_FORMATS.FEMTO]: -15,
  [TOKEN_AMOUNT_FORMATS.ATTO]: -18,
} as const;

// not exported from sdk
export const AE_DENOMINATION_MAGNITUDE = {
  [AE_AMOUNT_FORMATS.AE]: 0,
  [AE_AMOUNT_FORMATS.MILI_AE]: -3,
  [AE_AMOUNT_FORMATS.MICRO_AE]: -6,
  [AE_AMOUNT_FORMATS.NANO_AE]: -9,
  [AE_AMOUNT_FORMATS.PICO_AE]: -12,
  [AE_AMOUNT_FORMATS.FEMTO_AE]: -15,
  [AE_AMOUNT_FORMATS.AETTOS]: -18,
} as const;

export interface Denomination {
  denominationAe?: AE_AMOUNT_FORMATS;
  denominationToken?: TOKEN_AMOUNT_FORMATS;
  customDecimalsToken?: bigint;
}

export const defaultDenominations = {
  denominationAe: AE_AMOUNT_FORMATS.AE,
  denominationToken: TOKEN_AMOUNT_FORMATS.FULL,
};

export function changeTokenToAeDenomination(
  count: bigint | string | number,
  denomination?: Denomination,
  directionTokenToAe = true,
) {
  const tokenMagnitude = Number(-denominationTokenDecimals(denomination));

  const aeMagnitude =
    AE_DENOMINATION_MAGNITUDE[
      denomination?.denominationAe || defaultDenominations.denominationAe
    ];

  return new BigNumber(count.toString())
    .shiftedBy(
      directionTokenToAe
        ? tokenMagnitude - aeMagnitude
        : aeMagnitude - tokenMagnitude,
    )
    .toFixed();
}

export function denominationTokenDecimals(denomination?: Denomination): bigint {
  const decimals =
    denomination?.customDecimalsToken ||
    (denomination?.denominationToken
      ? -BigInt(TOKEN_DENOMINATION_MAGNITUDE[denomination?.denominationToken])
      : 0n);

  if (decimals === undefined)
    throw Error(
      "either customDecimalsToken, denominationToken or tokenDecimals need to be defined",
    );

  return decimals;
}

export function toTokenDecimals(
  count: bigint | string | number,
  denominationDecimals: bigint,
  decimals: bigint,
) {
  return new BigNumber(count.toString())
    .shiftedBy(Number(-denominationDecimals) - Number(-decimals))
    .toFixed();
}
