import { Encoded } from "@aeternity/aepp-sdk";
import { TokenMetaInfo } from "./TokenMetaInfo";

export interface MetaInfo {
  owner: Encoded.AccountAddress;
  token: TokenMetaInfo;
}
