import { Encoded } from "@aeternity/aepp-sdk";
import { MetaInfo } from "./MetaInfo";

export interface BondingCurveMetaInfo extends MetaInfo {
  beneficiary: Encoded.AccountAddress;
  bondingCurve: Encoded.ContractAddress;
}
