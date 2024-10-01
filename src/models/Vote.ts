import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import ContractWithMethods from "@aeternity/aepp-sdk/es/contract/Contract";
import { AeSdkBase, ContractMethodsBase } from "@aeternity/aepp-sdk";
import { createOrChangeAllowance } from "../utils";
import { DAOState } from "./DAO";

export enum VOTE_TYPE {
  VotePayout = "VotePayout",
  VotePayoutAmount = "VotePayoutAmount",
  ChangeDAO = "ChangeDAO",
  ChangeMetaInfo = "ChangeMetaInfo",
  ChangeMinimumTokenThreshold = "ChangeMinimumTokenThreshold",
  AddModerator = "AddModerator",
  DeleteModerator = "DeleteModerator",
}

export type VoteSubject =
  | { [VOTE_TYPE.VotePayout]: [Encoded.AccountAddress] }
  | { [VOTE_TYPE.VotePayoutAmount]: [Encoded.AccountAddress, bigint] }
  | { [VOTE_TYPE.ChangeDAO]: [Encoded.AccountAddress] }
  | { [VOTE_TYPE.ChangeMetaInfo]: [Map<string, string>] }
  | { [VOTE_TYPE.ChangeMinimumTokenThreshold]: [bigint] }
  | { [VOTE_TYPE.AddModerator]: [Encoded.AccountAddress] }
  | { [VOTE_TYPE.DeleteModerator]: [Encoded.AccountAddress] };

export interface VoteMetadata {
  subject: VoteSubject;
  description: string;
  link: string;
}

export interface VoteState {
  close_height: bigint;
  create_height: bigint;
  metadata: VoteMetadata;
  token: Encoded.ContractAddress;
  author: Encoded.AccountAddress;
  vote_accounts: Map<Encoded.AccountAddress, [bigint, boolean, boolean]>;
  vote_state: Map<boolean, bigint>;
}

export enum VOTE_STATE_LABEL {
  APPLIED = "Applied",
  TIMEOUT = "Timouted",
  APPLIABLE = "Appliable",
  NOT_SUCCESSFUL = "Not Successful",
  OPEN = "Open",
}

export class Vote {
  contract: ContractWithMethods<ContractMethodsBase>;
  aeSdk: AeSdkBase;
  address: Encoded.ContractAddress;
  voteId: bigint;

  constructor(
    contract: ContractWithMethods<ContractMethodsBase>,
    voteId: bigint,
    aeSdk: AeSdkBase,
  ) {
    this.voteId = voteId;
    this.contract = contract;
    this.address = contract.$options.address;
    this.aeSdk = aeSdk;
  }

  async state(): Promise<VoteState> {
    return this.contract
      .get_state()
      .then((res) => res.decodedResult as VoteState);
  }

  async revokeVote() {
    await this.contract.revoke_vote();
  }

  async withdraw() {
    await this.contract.withdraw();
  }

  closeHeight(voteState: VoteState): number {
    return Number(voteState.close_height);
  }

  timeoutHeight(voteState: VoteState, treasuryState: DAOState): number {
    return this.closeHeight(voteState) + Number(treasuryState.vote_timeout);
  }

  voteYesPercentage(voteState: VoteState): number {
    const totalVoted =
      voteState.vote_state.get(true) + voteState.vote_state.get(false);

    if (totalVoted === 0n) return 0;
    return Number(100n * (voteState.vote_state.get(true) / totalVoted));
  }

  voteStakeYesPercentage(
    voteState: VoteState,
    tokenSupply: bigint | undefined,
  ): number {
    if (tokenSupply === 0n) return 0;

    return Number(100n * (voteState.vote_state.get(true) / tokenSupply));
  }

  accountHasLockedBalance(
    voteState: VoteState,
    account: Encoded.AccountAddress,
  ): boolean {
    return !!(
      !voteState.vote_accounts.get(account)?.[2] &&
      voteState.vote_accounts.get(account)?.[0]
    );
  }

  accountVotedBalance(
    voteState: VoteState,
    account: Encoded.AccountAddress,
  ): bigint | undefined {
    return voteState.vote_accounts.get(account)?.[0];
  }

  accountVotedAgreement(
    voteState: VoteState,
    account: Encoded.AccountAddress,
  ): boolean | undefined {
    return voteState.vote_accounts.get(account)?.[1];
  }

  accountVoted(voteState: VoteState, account: Encoded.AccountAddress): boolean {
    return voteState.vote_accounts.has(account);
  }

  async voteStateLabel(
    voteState: VoteState,
    treasuryState: DAOState,
    tokenSupply: bigint,
  ) {
    const currentHeight = await this.aeSdk.getHeight();
    const closeHeight = this.closeHeight(voteState);
    const timeoutHeight = this.timeoutHeight(voteState, treasuryState);

    if (treasuryState.votes.get(this.voteId)?.[0])
      return VOTE_STATE_LABEL.APPLIED;
    else if (
      voteState.create_height <= currentHeight &&
      closeHeight > currentHeight
    )
      return VOTE_STATE_LABEL.OPEN;
    else if (closeHeight <= currentHeight && timeoutHeight > currentHeight) {
      if (
        this.voteYesPercentage(voteState) > 50 &&
        this.voteStakeYesPercentage(voteState, tokenSupply) > 50
      )
        return VOTE_STATE_LABEL.APPLIABLE;
      else return VOTE_STATE_LABEL.NOT_SUCCESSFUL;
    } else return VOTE_STATE_LABEL.TIMEOUT;
  }

  canVote(
    voteStateLabel: VOTE_STATE_LABEL,
    voteState: VoteState,
    account: Encoded.AccountAddress,
  ) {
    return (
      voteStateLabel === VOTE_STATE_LABEL.OPEN &&
      !voteState.vote_accounts.has(account)
    );
  }

  canRevokeVote(
    voteStateLabel: VOTE_STATE_LABEL,
    voteState: VoteState,
    account: Encoded.AccountAddress,
  ) {
    return (
      voteStateLabel === VOTE_STATE_LABEL.OPEN &&
      voteState.vote_accounts.has(account)
    );
  }

  canWithdraw(
    voteStateLabel: VOTE_STATE_LABEL,
    voteState: VoteState,
    account: Encoded.AccountAddress,
  ) {
    return (
      (voteStateLabel === VOTE_STATE_LABEL.APPLIABLE ||
        voteStateLabel === VOTE_STATE_LABEL.APPLIED ||
        voteStateLabel === VOTE_STATE_LABEL.NOT_SUCCESSFUL ||
        voteStateLabel === VOTE_STATE_LABEL.TIMEOUT) &&
      voteState.vote_accounts.get(account)?.[2] === false
    );
  }

  canApply(voteStateLabel: VOTE_STATE_LABEL) {
    return voteStateLabel === VOTE_STATE_LABEL.APPLIABLE;
  }

  async vote(
    option: boolean,
    stake: bigint,
    tokenInstance: ContractWithMethods<ContractMethodsBase>,
  ) {
    await createOrChangeAllowance(
      this.aeSdk,
      tokenInstance,
      this.address.replace("ct_", "ak_") as Encoded.AccountAddress,
      stake.toString(),
    );

    await this.contract.vote(option, stake);
  }
}
