import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";

export interface TokenMetaInfo {
  address: Encoded.ContractAddress;
  decimals: bigint;
  name: string;
  symbol: string;
}
