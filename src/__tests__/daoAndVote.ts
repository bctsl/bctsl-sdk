import { beforeAll, describe, it } from "@jest/globals";
import { utils } from "@aeternity/aeproject";

import {
  BondingCurveTokenSale,
  CommunityFactory,
  DAO,
  deployCommunityFactory,
  Vote,
  VOTE_STATE_LABEL,
  VOTE_TYPE,
  VoteMetadata,
} from "../index";
import { AeSdk, generateKeyPair } from "@aeternity/aepp-sdk";
import { allowedNameChars, allowedNameLength } from "./communityFactory";

describe("DAOAndVote", () => {
  let aeSdk: AeSdk;
  let tokenSale: BondingCurveTokenSale;
  let communityFactory: CommunityFactory;
  let dao: DAO;

  const beneficiary = generateKeyPair();
  const voteMetaData: VoteMetadata = {
    subject: { [VOTE_TYPE.VotePayout]: [beneficiary.publicKey] },
    description: "",
    link: "",
  };

  beforeAll(async () => {
    aeSdk = utils.getSdk({});

    communityFactory = await deployCommunityFactory(
      aeSdk,
      "PROTOCOL-TOKEN-TEST",
    );

    const collectionName = await communityFactory.createCollection(
      "COLLECTION-TEST",
      allowedNameLength,
      allowedNameChars,
    );
    tokenSale = await communityFactory.createCommunity(
      collectionName,
      "TS18",
      new Map(),
      0,
    );
    dao = await tokenSale.checkAndGetDAO();

    await utils.createSnapshot(aeSdk);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await utils.rollbackSnapshot(aeSdk);
  });

  describe("DAO", () => {
    it("state", async () => {
      expect(await dao.state()).toEqual({
        factory: communityFactory.address,
        token_sale: tokenSale.address,
        vote_timeout: 960n,
        votes: new Map(),
      });
    });

    it("balanceAettos", async () => {
      expect(await dao.balanceAettos()).toEqual("0");
    });

    it("tokenContractInstance", async () => {
      expect(
        await dao.tokenContractInstance().then((res) => res.$options.address),
      ).toEqual(
        await tokenSale
          .tokenContractInstance()
          .then((res) => res.$options.address),
      );
    });

    it("addVote", async () => {
      //only token holder can add vote
      await tokenSale.buy(1);

      const vote = await dao.addVote(voteMetaData);
      expect(vote).toBeInstanceOf(Vote);
    });
  });

  // detailed cases for the contract behaviour are tested in the contract repository for close, apply and timeout
  describe("Vote", () => {
    it("state", async () => {
      //only token holder can add vote
      await tokenSale.buy(1);
      const height = await aeSdk.getHeight();
      const vote = await dao.addVote(voteMetaData);

      const state = await vote.state();

      expect(state).toEqual({
        create_height: BigInt(height),
        close_height: BigInt(height) + 6720n,
        metadata: voteMetaData,
        token: await tokenSale
          .tokenContractInstance()
          .then((res) => res.$options.address),
        author: aeSdk.address,
        vote_accounts: new Map(),
        vote_state: new Map([
          [false, 0n],
          [true, 0n],
        ]),
      });
    });

    it("helpers: started vote, running, no choices", async () => {
      //only token holder can add vote
      await tokenSale.buy(1);
      const vote = await dao.addVote(voteMetaData);
      const state = await vote.state();
      const daoState = await dao.state();

      expect(vote.voteYesPercentage(state)).toEqual(0);
      expect(vote.voteStakeYesPercentage(state, 0n)).toEqual(0);
      expect(vote.accountHasLockedBalance(state, aeSdk.address)).toEqual(false);
      expect(vote.accountVotedBalance(state, aeSdk.address)).toEqual(undefined);
      expect(vote.accountVotedAgreement(state, aeSdk.address)).toEqual(
        undefined,
      );
      expect(vote.accountVoted(state, aeSdk.address)).toEqual(false);

      const voteStateLabel = await vote.voteStateLabel(state, daoState, 0n);
      expect(voteStateLabel).toEqual(VOTE_STATE_LABEL.OPEN);
      expect(vote.canVote(voteStateLabel, state, aeSdk.address)).toEqual(true);
      expect(vote.canRevokeVote(voteStateLabel, state, aeSdk.address)).toEqual(
        false,
      );
      expect(vote.canWithdraw(voteStateLabel, state, aeSdk.address)).toEqual(
        false,
      );
      expect(vote.canApply(voteStateLabel)).toEqual(false);
    });

    it("vote, helpers: started vote, running, voted", async () => {
      //only token holder can add vote
      await tokenSale.buy(1);
      const vote = await dao.addVote(voteMetaData);
      await vote.vote(true, 1n, await dao.tokenContractInstance());
      const state = await vote.state();
      const daoState = await dao.state();

      expect(vote.voteYesPercentage(state)).toEqual(100);
      expect(vote.voteStakeYesPercentage(state, 1n)).toEqual(100);
      expect(vote.accountHasLockedBalance(state, aeSdk.address)).toEqual(true);
      expect(vote.accountVotedBalance(state, aeSdk.address)).toEqual(1n);
      expect(vote.accountVotedAgreement(state, aeSdk.address)).toEqual(true);
      expect(vote.accountVoted(state, aeSdk.address)).toEqual(true);

      const voteStateLabel = await vote.voteStateLabel(state, daoState, 0n);
      expect(voteStateLabel).toEqual(VOTE_STATE_LABEL.OPEN);
      expect(vote.canVote(voteStateLabel, state, aeSdk.address)).toEqual(false);
      expect(vote.canRevokeVote(voteStateLabel, state, aeSdk.address)).toEqual(
        true,
      );
      expect(vote.canWithdraw(voteStateLabel, state, aeSdk.address)).toEqual(
        false,
      );
      expect(vote.canApply(voteStateLabel)).toEqual(false);
    });

    it("revoke vote, helpers: started vote, running, voted, revoked", async () => {
      //only token holder can add vote
      await tokenSale.buy(1);
      const vote = await dao.addVote(voteMetaData);
      await vote.vote(true, 1n, await dao.tokenContractInstance());
      await vote.revokeVote();

      const state = await vote.state();
      const daoState = await dao.state();

      expect(vote.voteYesPercentage(state)).toEqual(0);
      expect(vote.voteStakeYesPercentage(state, 0n)).toEqual(0);
      expect(vote.accountHasLockedBalance(state, aeSdk.address)).toEqual(false);
      expect(vote.accountVotedBalance(state, aeSdk.address)).toEqual(undefined);
      expect(vote.accountVotedAgreement(state, aeSdk.address)).toEqual(
        undefined,
      );
      expect(vote.accountVoted(state, aeSdk.address)).toEqual(false);

      const voteStateLabel = await vote.voteStateLabel(state, daoState, 0n);
      expect(voteStateLabel).toEqual(VOTE_STATE_LABEL.OPEN);
      expect(vote.canVote(voteStateLabel, state, aeSdk.address)).toEqual(true);
      expect(vote.canRevokeVote(voteStateLabel, state, aeSdk.address)).toEqual(
        false,
      );
      expect(vote.canWithdraw(voteStateLabel, state, aeSdk.address)).toEqual(
        false,
      );
      expect(vote.canApply(voteStateLabel)).toEqual(false);
    });

    // TODO cases for the helpers that are after the vote ended are hard to test here
  });
});
