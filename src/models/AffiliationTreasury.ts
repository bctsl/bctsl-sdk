import {
  AeSdkBase,
  Contract as ContractWithMethods,
  ContractMethodsBase,
  Encoded,
  MemoryAccount,
} from "@aeternity/aepp-sdk";

export type InvitationCode = [Encoded.AccountAddress, bigint, boolean];

export type InvitationCodes = Map<bigint, InvitationCode>;

export type UniqueInvitees =
  | { ThresholdReached: [] }
  | {
      WaitingForInvitations: [
        Encoded.AccountAddress[],
        Map<Encoded.AccountAddress, bigint>,
      ];
    };

export interface AffiliationTreasuryState {
  payout_periods: Map<bigint, Map<Encoded.AccountAddress, bigint>>;
  affiliation_tree: Map<bigint, Encoded.AccountAddress>;
  invitation_codes: InvitationCodes;
  unique_invitees: Map<
    bigint,
    | {
        WaitingForInvitations: [
          [Encoded.AccountAddress],
          Map<Encoded.AccountAddress, bigint>,
        ];
      }
    | { ThresholdReached: [] }
  >;
}

export class AffiliationTreasury {
  contract: ContractWithMethods<ContractMethodsBase>;
  aeSdk: AeSdkBase;
  address: Encoded.ContractAddress;

  constructor(
    contract: ContractWithMethods<ContractMethodsBase>,
    aeSdk: AeSdkBase,
  ) {
    this.contract = contract;
    this.address = contract.$options.address;
    this.aeSdk = aeSdk;
  }

  async state(): Promise<AffiliationTreasuryState> {
    return this.contract
      .get_state()
      .then((res) => res.decodedResult as AffiliationTreasuryState);
  }

  async registerInvitationCode(
    invitationAddress: Encoded.AccountAddress[],
    redemptionFeeCover: bigint,
    invitationAmount: bigint,
  ): Promise<void> {
    await this.contract.register_invitation_code(
      invitationAddress,
      redemptionFeeCover,
      invitationAmount,
      {
        amount:
          (redemptionFeeCover + invitationAmount) *
          BigInt(invitationAddress.length),
      },
    );
  }

  async revokeInvitationCode(
    invitationAddress: Encoded.AccountAddress,
  ): Promise<void> {
    await this.contract.revoke_invitation_code(invitationAddress);
  }

  async invitationCodes(): Promise<InvitationCodes> {
    return await this.contract
      .invitation_codes()
      .then(({ decodedResult }) => decodedResult as InvitationCodes);
  }

  async getInvitationCode(
    address: Encoded.AccountAddress,
  ): Promise<InvitationCode> {
    return this.contract
      .get_invitation_code(address)
      .then(({ decodedResult }) => decodedResult as InvitationCode);
  }

  async redeemInvitationCode(
    invitationCode: Encoded.AccountSecretKey,
    inviteeAddress: Encoded.AccountAddress,
  ): Promise<void> {
    await this.contract.redeem_invitation_code(inviteeAddress, {
      onAccount: new MemoryAccount(invitationCode),
    });
  }

  async getAccumulatedRewards(
    account: Encoded.AccountAddress,
  ): Promise<bigint> {
    return await this.contract
      .get_accumulated_rewards(account)
      .then(({ decodedResult }) => decodedResult as bigint);
  }

  async getUniqueInvitee(
    account: Encoded.AccountAddress,
  ): Promise<UniqueInvitees> {
    return this.contract
      .get_unique_invitee(account)
      .then(({ decodedResult }) => decodedResult as UniqueInvitees);
  }

  async withdraw(): Promise<void> {
    await this.contract.withdraw();
  }
}
