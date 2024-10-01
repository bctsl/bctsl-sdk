import { beforeAll, describe, it } from "@jest/globals";
import { utils } from "@aeternity/aeproject";
import { AeSdk } from "@aeternity/aepp-sdk";
import {
  SaleType,
  deployCommunityFactory,
  BondingCurveTokenSale,
} from "../index";
import { initTokenSale } from "../lib";
import { allowedNameChars, allowedNameLength } from "./communityFactory";

describe("TokenSale Lib", () => {
  let aeSdk: AeSdk;
  let affiliationTokenGatingTokenSale: BondingCurveTokenSale;

  beforeAll(async () => {
    aeSdk = utils.getSdk({});
    await utils.rollbackHeight(aeSdk, 0);

    const communityFactory = await deployCommunityFactory(
      aeSdk,
      "PROTOCOL-TOKEN-TEST",
    );

    const collectionName = await communityFactory.createCollection(
      "COLLECTION-TEST",
      allowedNameLength,
      allowedNameChars,
    );
    affiliationTokenGatingTokenSale = await communityFactory.createCommunity(
      collectionName,
      "TS-1",
      new Map(),
      0,
    );

    await utils.createSnapshot(aeSdk);
  });

  afterEach(async () => {
    await utils.rollbackSnapshot(aeSdk);
  });

  describe("initTokenSale", () => {
    it("affiliationTokenGatingTokenSale", async () => {
      const tokenSale = await initTokenSale(
        aeSdk,
        affiliationTokenGatingTokenSale.address,
      );
      expect(tokenSale.saleType).toBe(SaleType.AFFILIATION_BONDING_CURVE);
    });
  });
});
