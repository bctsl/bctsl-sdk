import COMMUNITY_FACTORY_CONTRACT_ACI from "bctsl-contracts/generated/CommunityFactory.aci.json";
import { AeSdkBase } from "@aeternity/aepp-sdk";
import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import TOKEN_GATING_BYTECODEHASHES from "bctsl-contracts/generated/bytecode_hashes.json";
import { CommunityFactory, DAO, Vote } from "../models";
import DAO_ACI from "bctsl-contracts/generated/DAO.aci.json";
import DAO_VOTE_ACI from "bctsl-contracts/generated/DAOVote.aci.json";

export type CommunityFactoryNameChars = (
  | { SingleChar: number[] }
  | { CharRangeFromTo: number[] }
)[];

export async function initCommunityFactory(
  aeSdk: AeSdkBase,
  tokenSaleFactoryAddress: Encoded.ContractAddress,
): Promise<CommunityFactory> {
  const contract = await aeSdk.initializeContract({
    address: tokenSaleFactoryAddress,
    aci: COMMUNITY_FACTORY_CONTRACT_ACI,
  });

  return new CommunityFactory(contract, aeSdk);
}

export async function deployCommunityFactory(
  aeSdk: AeSdkBase,
  protocolDaoTokenName: string,
): Promise<CommunityFactory> {
  const contract = await aeSdk.initializeContract({
    bytecode: TOKEN_GATING_BYTECODEHASHES["8.0.0"]["CommunityFactory.aes"]
      .bytecode as Encoded.ContractBytearray,
    aci: COMMUNITY_FACTORY_CONTRACT_ACI,
  });

  await contract.init(protocolDaoTokenName);
  return new CommunityFactory(contract, aeSdk);
}

export async function initDAO(
  aeSdk: AeSdkBase,
  address: Encoded.ContractAddress,
): Promise<DAO> {
  return new DAO(
    await aeSdk.initializeContract({
      aci: DAO_ACI,
      address: address,
    }),
    aeSdk,
  );
}

export async function initDAOVote(
  aeSdk: AeSdkBase,
  address: Encoded.ContractAddress,
  voteId: bigint,
): Promise<Vote> {
  return new Vote(
    await aeSdk.initializeContract({
      aci: DAO_VOTE_ACI,
      address: address,
    }),
    voteId,
    aeSdk,
  );
}
