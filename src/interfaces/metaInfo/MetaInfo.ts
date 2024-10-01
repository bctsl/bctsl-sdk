import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import { TokenMetaInfo } from "./TokenMetaInfo";

export interface MetaInfo {
  owner: Encoded.AccountAddress;
  token: TokenMetaInfo;
}
