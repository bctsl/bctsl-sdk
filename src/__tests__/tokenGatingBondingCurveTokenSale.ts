import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { utils } from "@aeternity/aeproject";

import { AE_AMOUNT_FORMATS, AeSdk } from "@aeternity/aepp-sdk";

import {
  BondingCurveTokenSale,
  createCommunity,
  CurveType,
  DAO,
  Denomination,
  deployCommunityFactory,
  estimateInitialBuyPriceAetto,
  initAffiliationTokenGatingTokenSale,
  SaleType,
  TOKEN_AMOUNT_FORMATS,
} from "../index";
import { CommunityFactory } from "../models";
import { allowedNameChars, allowedNameLength } from "./communityFactory";

const { wallets } = utils;

describe("TokenGatingBondingCurveTokenSale.ts", () => {
  let aeSdk: AeSdk;
  let tokenSale: BondingCurveTokenSale;
  let communityFactory: CommunityFactory;
  let collectionName;

  beforeAll(async () => {
    aeSdk = utils.getSdk({});

    communityFactory = await deployCommunityFactory(
      aeSdk,
      "PROTOCOL-TOKEN-TEST",
    );

    collectionName = await communityFactory.createCollection(
      "COLLECTION-TEST",
      allowedNameLength,
      allowedNameChars,
    );

    tokenSale = await createCommunity(
      aeSdk,
      collectionName,
      {
        initialBuyCount: 0,
        metaInfo: new Map<string, string>(),
        token: {
          name: "TS18",
        },
      },
      undefined,
      communityFactory.address,
    );

    await utils.createSnapshot(aeSdk);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await utils.rollbackSnapshot(aeSdk);
  });

  describe("bonding curve util", () => {
    it("estimateInitialBuyPriceAetto", async () => {
      expect(
        await estimateInitialBuyPriceAetto(
          aeSdk,
          100000n,
          (await tokenSale.bondingCurveContract()).instance.$options.address,
        ),
      ).toBe("60016670834166805");

      expect(
        await estimateInitialBuyPriceAetto(
          aeSdk,
          1000000n,
          (await tokenSale.bondingCurveContract()).instance.$options.address,
        ),
      ).toBe("5116708416805754216");
    });
  });

  describe("price", () => {
    describe("18 decimals default", () => {
      it("default denomination", async () => {
        const price = await tokenSale.price(1n);
        expect(price).toBe("0.000000100505025");
      });

      it("default denomination, fraction string", async () => {
        const price = await tokenSale.price("1.141358902342371412");
        expect(price).toBe("0.000000114713115752");
      });

      it("default denomination, fraction number", async () => {
        // number can't do so much precision
        const price = await tokenSale.price(1.14135);
        expect(price).toBe("0.000000114712220965");
      });

      it("same denomination, aetto, atto", async () => {
        const price = await tokenSale.price(1n * 10n ** 18n, {
          denominationToken: TOKEN_AMOUNT_FORMATS.ATTO,
          denominationAe: AE_AMOUNT_FORMATS.AETTOS,
        });
        expect(price).toBe("100505025000");
      });

      it("default denomination, aetto, full", async () => {
        const price = await tokenSale.price(1n, {
          denominationToken: TOKEN_AMOUNT_FORMATS.FULL,
          denominationAe: AE_AMOUNT_FORMATS.AETTOS,
        });
        expect(price).toBe("100505025000");
      });

      it("default denomination, ae, smallest", async () => {
        const price = await tokenSale.price(1n * 10n ** 18n, {
          denominationAe: AE_AMOUNT_FORMATS.AE,
          denominationToken: TOKEN_AMOUNT_FORMATS.ATTO,
        });
        expect(price).toBe("0.000000100505025");
      });
    });
  });

  describe("deployAndBuy, tokenContractInstance", () => {
    const createCommunityWithCount = (
      initialBuyCount: string | bigint | number,
      denomination?: Denomination,
    ) => {
      return createCommunity(
        aeSdk,
        collectionName,
        {
          initialBuyCount,
          metaInfo: new Map<string, string>(),
          token: {
            name: "TS1",
          },
        },
        denomination,
        communityFactory.address,
      );
    };

    describe("18 decimals default", () => {
      it("default denomination", async () => {
        const localTokenSale = await createCommunityWithCount(2);
        const tokenContract = await localTokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(2000000000000000000n);
      });

      it("default denomination, buy fraction string", async () => {
        const localTokenSale = await createCommunityWithCount("1.4314515");
        const tokenContract = await localTokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(1431451500000000000n);
      });

      it("default denomination, buy fraction number", async () => {
        const localTokenSale = await createCommunityWithCount(1.4314515);
        const tokenContract = await localTokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(1431451500000000000n);
      });

      it("atto denomination", async () => {
        const localTokenSale = await createCommunityWithCount(2n * 10n ** 18n, {
          denominationToken: TOKEN_AMOUNT_FORMATS.ATTO,
        });
        const tokenContract = await localTokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(2000000000000000000n);
      });
    });
  });

  describe("buy, tokenContractInstance", () => {
    describe("18 decimals default", () => {
      it("default denomination", async () => {
        await tokenSale.buy(2n);
        const tokenContract = await tokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(2000000000000000000n);
      });

      it("default slippage", async () => {
        const buySpy = vi.spyOn(tokenSale.contract, "buy");

        await tokenSale.buy(2n);
        expect(buySpy.mock.calls[0][1]).toStrictEqual({
          amount: "207050703000",
          omitUnknown: true,
        });
      });

      it("no slippage", async () => {
        const buySpy = vi.spyOn(tokenSale.contract, "buy");

        await tokenSale.buy(2n, undefined, 0);
        expect(buySpy.mock.calls[0][1]).toStrictEqual({
          amount: "201020100000", // + 0%
          omitUnknown: true,
        });
      });

      it("negative slippage", async () => {
        const buySpy = vi.spyOn(tokenSale.contract, "buy");

        await expect(tokenSale.buy(2n, undefined, -1)).rejects.toThrow(
          "AE_AMOUNT_NOT_SUFFICIENT",
        );
        expect(buySpy.mock.calls[0][1]).toStrictEqual({
          amount: "199009899000", // - 1%
          omitUnknown: true,
        });
      });

      it("default denomination, buy fraction string", async () => {
        await tokenSale.buy("1.4314515");
        const tokenContract = await tokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(1431451500000000000n);
      });

      it("default denomination, buy fraction number", async () => {
        await tokenSale.buy(1.4314515);
        const tokenContract = await tokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(1431451500000000000n);
      });

      it("atto denomination", async () => {
        await tokenSale.buy(2n * 10n ** 18n, {
          denominationToken: TOKEN_AMOUNT_FORMATS.ATTO,
        });
        const tokenContract = await tokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(2000000000000000000n);
      });
    });
  });

  it("checkAndGetDAO", async () => {
    const dao = await tokenSale.checkAndGetDAO();
    expect(dao).toBeInstanceOf(DAO);
  });

  it("metaInfo", async () => {
    const metaInfo = await tokenSale.metaInfo();
    expect(metaInfo.beneficiary).toBe(metaInfo.owner);
    expect(metaInfo.bondingCurve).toBe(
      await tokenSale
        .bondingCurveContract()
        .then((contract) => contract.instance.$options.address),
    );
    expect(metaInfo.beneficiary).not.toBe(wallets[0].publicKey);
    expect(metaInfo.owner).not.toBe(wallets[0].publicKey);
    expect(metaInfo.token.decimals).toBe(18n);
    expect(metaInfo.token.symbol).toBe("TS18");
    expect(metaInfo.token.name).toBe("TS18");
  });

  it("saleType", async () => {
    const saleType = await tokenSale.saleType();
    expect(saleType).toBe(SaleType.AFFILIATION_BONDING_CURVE);
  });

  it("version", async () => {
    const version = await tokenSale.version();
    expect(version).toBe(1n);
  });

  it("bondingCurveContract", async () => {
    const bondingCurveContract = await tokenSale.bondingCurveContract();
    expect(bondingCurveContract.instance).toHaveProperty("get_k");
    expect(bondingCurveContract.instance).toHaveProperty("get_initial_price");
    expect(bondingCurveContract.instance).toHaveProperty("get_minimum_count");
    expect(bondingCurveContract.instance).toHaveProperty(
      "get_sell_return_percentage",
    );
    expect(bondingCurveContract.instance).toHaveProperty(
      "get_sell_return_precision",
    );
    expect(bondingCurveContract.type).toBe(CurveType.TAYLOR_EXPONENTIAL_V1);
  });

  it("initAffiliationTokenGatingTokenSale", async () => {
    const initTokenSale = await initAffiliationTokenGatingTokenSale(
      aeSdk,
      tokenSale.address,
    );
    const metaInfo = await initTokenSale.metaInfo();
    expect(metaInfo.token.name).toBe("TS18");
  });

  it("getCommunityManagementContract", async () => {
    const communityManagement =
      await communityFactory.getCommunityManagementContract(tokenSale.address);

    expect(communityManagement).toHaveProperty("meta_info");
  });

  describe("sellReturn", () => {
    describe("18 decimals default", () => {
      beforeEach(async () => {
        await tokenSale.buy(1n);
      });

      it("default denomination", async () => {
        const sellReturn = await tokenSale.sellReturn(1n);
        expect(sellReturn).toBe("0.000000099504975");
      });

      it("default denomination, fraction string", async () => {
        const sellReturn = await tokenSale.sellReturn("0.141358902342371412");
        expect(sellReturn).toBe("0.000000014066517891");
      });

      it("default denomination, fraction number", async () => {
        // number can't do so much precision
        const sellReturn = await tokenSale.sellReturn(0.14135);
        expect(sellReturn).toBe("0.000000014065632032");
      });

      it("same denomination, aetto, atto", async () => {
        const sellReturn = await tokenSale.sellReturn(1n * 10n ** 18n, {
          denominationToken: TOKEN_AMOUNT_FORMATS.ATTO,
          denominationAe: AE_AMOUNT_FORMATS.AETTOS,
        });
        expect(sellReturn).toBe("99504975000");
      });

      it("default denomination, aetto, full", async () => {
        const sellReturn = await tokenSale.sellReturn(1n, {
          denominationToken: TOKEN_AMOUNT_FORMATS.FULL,
          denominationAe: AE_AMOUNT_FORMATS.AETTOS,
        });
        expect(sellReturn).toBe("99504975000");
      });

      it("default denomination, ae, smallest", async () => {
        const sellReturn = await tokenSale.sellReturn(1n * 10n ** 18n, {
          denominationAe: AE_AMOUNT_FORMATS.AE,
          denominationToken: TOKEN_AMOUNT_FORMATS.ATTO,
        });
        expect(sellReturn).toBe("0.000000099504975");
      });
    });
  });

  // TODO check returned funds and remaining reserve foreach
  describe("sell, tokenContractInstance", () => {
    describe("18 decimals default", () => {
      beforeEach(async () => {
        await tokenSale.buy(3n);
      });

      it("default denomination", async () => {
        await tokenSale.sell(2n);
        const tokenContract = await tokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(1000000000000000000n);
      });

      it("default slippage", async () => {
        const sellSpy = vi.spyOn(tokenSale.contract, "sell");

        await tokenSale.sell(2n);
        expect(sellSpy.mock.calls[0][1]).toStrictEqual("193068606000");
      });

      it("no slippage", async () => {
        const sellSpy = vi.spyOn(tokenSale.contract, "sell");

        await tokenSale.sell(2n, undefined, 0);
        expect(sellSpy.mock.calls[0][1]).toStrictEqual("199039800000");
      });

      it("negative slippage", async () => {
        const sellSpy = vi.spyOn(tokenSale.contract, "sell");

        await expect(tokenSale.sell(2n, undefined, -1)).rejects.toThrow(
          "MINIMAL_RETURN_NOT_MEET",
        );
        expect(sellSpy.mock.calls[0][1]).toStrictEqual("201030198000");
      });

      it("default denomination, sell twice", async () => {
        await tokenSale.sell(1n);
        await tokenSale.sell(2n);
        const tokenContract = await tokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(0n);
      });

      it("default denomination, buy fraction string", async () => {
        await tokenSale.sell("1.4314515");
        const tokenContract = await tokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(1568548500000000000n);
      });

      it("default denomination, buy fraction number", async () => {
        await tokenSale.sell(1.4314515);
        const tokenContract = await tokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(1568548500000000000n);
      });

      it("atto denomination", async () => {
        await tokenSale.sell(2n * 10n ** 18n, {
          denominationToken: TOKEN_AMOUNT_FORMATS.ATTO,
        });
        const tokenContract = await tokenSale.tokenContractInstance();
        expect(
          await tokenContract
            .balance(wallets[0].publicKey)
            .then((res) => res.decodedResult),
        ).toBe(1000000000000000000n);
      });

      it("split function logic", async () => {
        const countTokenDecimals = await tokenSale.createSellAllowance(1n);
        expect(countTokenDecimals).toEqual("1000000000000000000"); // this is expected to be in the smallest unit
        const sellReturn = await tokenSale.sellWithExistingAllowance(countTokenDecimals) as { decodedResult: bigint };
        expect(sellReturn.decodedResult).toEqual(99524875000n); // this is expected to be in aetto
      });
    });
  });
});
