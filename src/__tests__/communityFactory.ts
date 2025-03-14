import { beforeAll, describe, it } from "@jest/globals";
import { utils } from "@aeternity/aeproject";
import { AeSdk, generateKeyPair } from "@aeternity/aepp-sdk";
import {
  AffiliationTreasury,
  CommunityFactory,
  deployCommunityFactory,
} from "../index";
import { expectObjectWithMapsEqual } from "./utils";

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
      await utils.createSnapshot(aeSdk);
    });

    it("state", async () => {
      const state = await affiliationTreasury.state();
      expectObjectWithMapsEqual(state, {
        payout_periods: new Map(),
        affiliation_tree: new Map(),
        invitation_codes: new Map(),
        unique_invitees: new Map(),
      });
    });

    it("revokeInvitationCode", async () => {
      await affiliationTreasury.registerInvitationCode(
        [invitation.publicKey],
        BigInt(10 ** 15),
        0n,
      );

      await affiliationTreasury.revokeInvitationCode(invitation.publicKey);

      const state = await affiliationTreasury.state();
      expectObjectWithMapsEqual(state, {
        payout_periods: new Map(),
        affiliation_tree: new Map(),
        invitation_codes: new Map(),
        unique_invitees: new Map(),
      });
    });

    it("registerInvitationCode", async () => {
      await affiliationTreasury.registerInvitationCode(
        [invitation.publicKey],
        BigInt(10 ** 15),
        0n,
      );

      const state = await affiliationTreasury.state();
      expectObjectWithMapsEqual(state, {
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
      expectObjectWithMapsEqual(state, {
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

    describe("register multiple invitation codes", () => {
      let invitation1, invitation2, invitation3;
      const totalInvitationAmount = BigInt(9 ** 18);
      const invitationAmount = totalInvitationAmount / BigInt(3); // 3 invitations

      beforeAll(async () => {
        await utils.rollbackSnapshot(aeSdk);
        invitation1 = generateKeyPair();
        invitation2 = generateKeyPair();
        invitation3 = generateKeyPair();

        await affiliationTreasury.registerInvitationCode(
          [invitation1.publicKey, invitation2.publicKey, invitation3.publicKey],
          BigInt(10 ** 15), // redemption fee
          invitationAmount,
        );
      });

      it("should register multiple invitation codes", async () => {
        const state = await affiliationTreasury.state();
        expectObjectWithMapsEqual(state, {
          payout_periods: new Map(),
          affiliation_tree: new Map(),
          invitation_codes: new Map([
            [invitation1.publicKey, [aeSdk.address, 50031545098999712n, false]],
            [invitation2.publicKey, [aeSdk.address, 50031545098999712n, false]],
            [invitation3.publicKey, [aeSdk.address, 50031545098999712n, false]],
          ]),
          unique_invitees: new Map(),
        });
      });

      it("should redeem an invitation code and record sale transaction", async () => {
        await affiliationTreasury.redeemInvitationCode(
          invitation1.secretKey,
          invitee.publicKey,
        );

        const buyAmount = BigInt(10 ** 18);
        const rewardAmount = buyAmount * BigInt(5) / BigInt(1000);
        await affiliationTreasury.contract.record_sale_transaction(invitee.publicKey, buyAmount, {
          amount: rewardAmount
        });

        const newState = await affiliationTreasury.state();
        expectObjectWithMapsEqual(newState, {
          payout_periods: new Map([[
            BigInt(Math.floor(Date.now() / 2592000000)), // 1000ms * 60s * 60m * 24h * 30d
            new Map([[aeSdk.address, 3000000000000000n]])
          ]]),
          affiliation_tree: new Map([[invitee.publicKey, aeSdk.address]]),
          invitation_codes: new Map([
            [invitation1.publicKey, [aeSdk.address, 50031545098999712n, true]], // true=redeemed
            [invitation2.publicKey, [aeSdk.address, 50031545098999712n, false]],
            [invitation3.publicKey, [aeSdk.address, 50031545098999712n, false]],
          ]),
          unique_invitees: new Map([
            [aeSdk.address, {
              "WaitingForInvitations": [
                new Set(),
                new Map([[invitee.publicKey, 1000000000000000000n]])
              ]
            }]
          ]),
        });
      });

      it("should get invitation code", async () => {
        const invitationCode = await affiliationTreasury.getInvitationCode(invitation1.publicKey);
        expect(invitationCode).toEqual([aeSdk.address, 50031545098999712n, true]);
      });

      it("should get unique invitee", async () => {
        const UniqueInvitee = await affiliationTreasury.getUniqueInvitee(aeSdk.address);
        expectObjectWithMapsEqual(UniqueInvitee, {
          "WaitingForInvitations": [
            new Set(),
            new Map([[invitee.publicKey, 1000000000000000000n]]),
          ]
        });
      });
    });
  });
});
