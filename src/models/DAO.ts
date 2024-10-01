import ContractWithMethods from "@aeternity/aepp-sdk/es/contract/Contract";
import {
  AE_AMOUNT_FORMATS,
  AeSdkBase,
  ContractMethodsBase,
} from "@aeternity/aepp-sdk";
import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import { initDAOVote, tokenContractInstance } from "../utils";
import { Vote, VoteMetadata } from "./Vote";

export interface DAOState {
  factory: Encoded.ContractAddress;
  token_sale: Encoded.ContractAddress;
  vote_timeout: bigint;
  votes: Map<bigint, [boolean, Encoded.ContractAddress]>;
}

export class DAO {
  contract: ContractWithMethods<ContractMethodsBase>;
  aeSdk: AeSdkBase;
  address: Encoded.ContractAddress;

  private tokenInstance?: ContractWithMethods<ContractMethodsBase>;
  protected tokenContractAddress?: Encoded.ContractAddress;

  constructor(
    contract: ContractWithMethods<ContractMethodsBase>,
    aeSdk: AeSdkBase,
  ) {
    this.contract = contract;
    this.address = contract.$options.address;
    this.aeSdk = aeSdk;
  }

  async state(): Promise<DAOState> {
    return this.contract
      .get_state()
      .then((res) => res.decodedResult as DAOState);
  }

  async balanceAettos(): Promise<string> {
    return this.aeSdk.getBalance(
      this.address.replace("ct_", "ak_") as Encoded.AccountAddress,
      { format: AE_AMOUNT_FORMATS.AETTOS },
    );
  }

  async applyVoteSubject(voteId: bigint) {
    await this.contract.apply_vote_subject(voteId);
  }

  async addVote(metadata: VoteMetadata): Promise<Vote> {
    const [voteId, address] = await this.contract
      .add_vote(metadata, { amount: 555n * 10n ** 18n })
      .then((res) => res.decodedResult as [bigint, Encoded.ContractAddress]);
    return initDAOVote(this.aeSdk, address, voteId);
  }

  async tokenContractInstance(): Promise<
    ContractWithMethods<ContractMethodsBase>
  > {
    if (this.tokenInstance) return this.tokenInstance;
    if (!this.tokenContractAddress) {
      this.tokenContractAddress = await this.contract
        .get_token()
        .then((res) => res.decodedResult);
    }

    return tokenContractInstance(this.aeSdk, this.tokenContractAddress);
  }
}
