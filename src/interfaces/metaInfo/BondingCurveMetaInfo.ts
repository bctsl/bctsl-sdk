import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import { MetaInfo } from "./MetaInfo";

export interface BondingCurveMetaInfo extends MetaInfo {
  beneficiary: Encoded.AccountAddress;
  bondingCurve: Encoded.ContractAddress;
}
