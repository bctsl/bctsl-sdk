import { beforeAll, describe, it } from "@jest/globals";
import { utils } from "@aeternity/aeproject";
import { AeSdk, generateKeyPair } from "@aeternity/aepp-sdk";
import {
  AffiliationTreasury,
  CommunityFactory,
  deployCommunityFactory,
} from "../index";

export const allowedNameLength = 20n;
export const allowedNameChars = [
  { SingleChar: [45] }, //"-"
  { CharRangeFromTo: [48, 57] }, //48: "0"; 57: "9"
  { CharRangeFromTo: [65, 90] }, //65: "A"; 90: "Z"
];

describe("CommunityFactory", () => {
  let aeSdk: AeSdk;
  let communityFactory: CommunityFactory;
  let collectionName: string;

  beforeAll(async () => {
    aeSdk = utils.getSdk({});
    await utils.rollbackHeight(aeSdk, 0);

    communityFactory = await deployCommunityFactory(
      aeSdk,
      "PROTOCOL-TOKEN-TEST",
    );

    collectionName = await communityFactory.createCollection(
      "COLLECTION-TEST",
      allowedNameLength,
      allowedNameChars,
    );
  });

  it("listRegisteredTokens ", async () => {
    const tokenSales =
      await communityFactory.listRegisteredTokens(collectionName);
    expect(tokenSales.size).toBe(0);

    await communityFactory.createCommunity(
      collectionName,
      "TS-1",
      new Map(),
      0,
    );

    const tokenSalesAfterDeploy =
      await communityFactory.listRegisteredTokens(collectionName);
    expect(tokenSalesAfterDeploy.size).toBe(1);
  });

  it("feePercentage ", async () => {
    const fee = await communityFactory.feePercentage();
    expect(fee).toBe(0.005);
  });

  describe("AffiliationTreasury", () => {
    let affiliationTreasury: AffiliationTreasury;
    const invitation = generateKeyPair();
    const invitee = generateKeyPair();

    it("affiliationTreasury ", async () => {
      affiliationTreasury = await communityFactory.affiliationTreasury();
      expect(affiliationTreasury).toBeDefined();
    });

    it("state", async () => {
      const state = await affiliationTreasury.state();
      expect(state).toEqual({
        payout_periods: new Map(),
        affiliation_tree: new Map(),
        invitation_codes: new Map(),
        unique_invitees: new Map(),
      });
    });

    it("revokeInvitationCode", async () => {
      await affiliationTreasury.registerInvitationCode(
        invitation.publicKey,
        BigInt(10 ** 15),
        0n,
      );

      await affiliationTreasury.revokeInvitationCode(invitation.publicKey);

      const state = await affiliationTreasury.state();
      expect(state).toEqual({
        payout_periods: new Map(),
        affiliation_tree: new Map(),
        invitation_codes: new Map(),
        unique_invitees: new Map(),
      });
    });

    it("registerInvitationCode", async () => {
      await affiliationTreasury.registerInvitationCode(
        invitation.publicKey,
        BigInt(10 ** 15),
        0n,
      );

      const state = await affiliationTreasury.state();
      expect(state).toEqual({
        payout_periods: new Map(),
        affiliation_tree: new Map(),
        invitation_codes: new Map([
          [invitation.publicKey, [aeSdk.address, 0n, false]],
        ]),
        unique_invitees: new Map(),
      });
    });

    it("invitationCodes", async () => {
      const invitationCodes = await affiliationTreasury.invitationCodes();

      expect(invitationCodes).toEqual(
        new Map([[invitation.publicKey, [aeSdk.address, 0n, false]]]),
      );
    });

    it("redeemInvitationCode", async () => {
      await affiliationTreasury.redeemInvitationCode(
        invitation.secretKey,
        invitee.publicKey,
      );

      const state = await affiliationTreasury.state();
      expect(state).toEqual({
        payout_periods: new Map(),
        affiliation_tree: new Map([[invitee.publicKey, aeSdk.address]]),
        invitation_codes: new Map([
          [invitation.publicKey, [aeSdk.address, 0n, true]],
        ]),
        unique_invitees: new Map(),
      });
    });

    it("getAccumulatedRewards", async () => {
      const rewards = await affiliationTreasury.getAccumulatedRewards(
        aeSdk.address,
      );

      expect(rewards).toEqual(0n);
    });

    it("withdraw", async () => {
      // this has proper tests in the contracts repository, just checking the implemented interface here
      await expect(affiliationTreasury.withdraw()).rejects.toThrow(
        "MINIMUM_ACCOUNTS_THRESHOLD_NOT_REACHED",
      );
    });
  });
});
