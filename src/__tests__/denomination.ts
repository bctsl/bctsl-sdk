import { describe, it } from "@jest/globals";
import {
  changeTokenToAeDenomination,
  TOKEN_AMOUNT_FORMATS,
  toTokenDecimals,
} from "../index";
import { AE_AMOUNT_FORMATS } from "@aeternity/aepp-sdk";

describe("Denomination", () => {
  describe("changeTokenToAeDenomination", () => {
    it("equal default 0, 0", async () => {
      const price = changeTokenToAeDenomination(1n);
      expect(price).toBe("1");
    });

    it("equal default -18, -18", async () => {
      const price = changeTokenToAeDenomination(1n, {
        denominationAe: AE_AMOUNT_FORMATS.AETTOS,
        denominationToken: TOKEN_AMOUNT_FORMATS.ATTO,
      });
      expect(price).toBe("1");
    });

    it("atto to ae -18, 0", async () => {
      const price = changeTokenToAeDenomination(1n, {
        denominationAe: AE_AMOUNT_FORMATS.AE,
        denominationToken: TOKEN_AMOUNT_FORMATS.ATTO,
      });
      expect(price).toBe("0.000000000000000001"); //1e-18
    });

    it("full to aetto 0, -18", async () => {
      const price = changeTokenToAeDenomination(1n, {
        denominationAe: AE_AMOUNT_FORMATS.AETTOS,
        denominationToken: TOKEN_AMOUNT_FORMATS.FULL,
      });
      expect(price).toBe("1000000000000000000"); //1e18
    });

    it("custom to aetto -1, -18", async () => {
      const price = changeTokenToAeDenomination(1n, {
        denominationAe: AE_AMOUNT_FORMATS.AETTOS,
        customDecimalsToken: 1n,
      });
      expect(price).toBe("100000000000000000"); //1e17
    });

    it("custom to aetto -1, -18", async () => {
      const price = changeTokenToAeDenomination(1n, {
        denominationAe: AE_AMOUNT_FORMATS.AE,
        customDecimalsToken: 1n,
      });
      expect(price).toBe("0.1");
    });

    it("customDecimalsToken false default", async () => {
      const price = changeTokenToAeDenomination(2n, {}, false);

      expect(price).toBe("2");
    });

    it("customDecimalsToken false aetto, full", async () => {
      const price = changeTokenToAeDenomination(
        2n,
        {
          denominationAe: AE_AMOUNT_FORMATS.AETTOS,
          denominationToken: TOKEN_AMOUNT_FORMATS.FULL,
        },
        false,
      );

      expect(price).toBe("0.000000000000000002"); // 2e-18
    });

    it("customDecimalsToken false, ae, atto", async () => {
      const price = changeTokenToAeDenomination(
        2n,
        {
          denominationAe: AE_AMOUNT_FORMATS.AE,
          denominationToken: TOKEN_AMOUNT_FORMATS.ATTO,
        },
        false,
      );

      expect(price).toBe("2000000000000000000"); // 2e18
    });

    it("customDecimalsToken false, -1", async () => {
      const price = changeTokenToAeDenomination(
        2n,
        {
          customDecimalsToken: 1n,
        },
        false,
      );

      expect(price).toBe("20");
    });
  });

  describe("toTokenDecimals", () => {
    it("Full 1", async () => {
      const price = toTokenDecimals(1n, 0n, 1n);
      expect(price).toBe("10");
    });
  });
});
