import { Encoded } from "@aeternity/aepp-sdk";

export interface TokenMetaInfo {
  address: Encoded.ContractAddress;
  decimals: bigint;
  name: string;
  symbol: string;
}
