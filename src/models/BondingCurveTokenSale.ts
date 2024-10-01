import { TokenSale } from "./TokenSale";
import { BondingCurveMetaInfo } from "../interfaces";
import {
  Denomination,
  denominationTokenDecimals,
  initBondingCurveContract,
  toTokenDecimals,
} from "../utils";
import {
  AE_AMOUNT_FORMATS,
  Contract,
  ContractMethodsBase,
  formatAmount,
} from "@aeternity/aepp-sdk";
import { CurveType } from "./CurveTypes";
import { createOrChangeAllowance } from "../utils";
import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import { BigNumber } from "bignumber.js";

export class BondingCurveTokenSale extends TokenSale {
  override async metaInfo(): Promise<BondingCurveMetaInfo> {
    const { state, tokenMetaInfo } = await this.stateAndMetaInfo();

    return {
      owner: state.owner,
      beneficiary: state.beneficiary,
      bondingCurve: state.bonding_curve,
      token: {
        address: state.token_contract,
        decimals: tokenMetaInfo.decimals,
        name: tokenMetaInfo.name,
        symbol: tokenMetaInfo.symbol,
      },
    };
  }

  async bondingCurveContract(): Promise<{
    instance: Contract<ContractMethodsBase>;
    type: CurveType;
  }> {
    const address = await this.contract
      .bonding_curve()
      .then((res) => res.decodedResult);

    return initBondingCurveContract(this.aeSdk, address);
  }

  private async sellReturnAettoTokenDecimals(
    count: bigint | string | number,
    denomination?: Denomination,
  ): Promise<{
    tokenDecimals: bigint;
    priceAetto: bigint;
  }> {
    if (!this.decimals) {
      const tokenMetaInfo = await this.tokenContractInstance()
        .then((tokenContract) => tokenContract.meta_info())
        .then((res) => res.decodedResult);

      this.decimals = tokenMetaInfo.decimals;
    }

    const countTokenDecimals = toTokenDecimals(
      count,
      denominationTokenDecimals(denomination),
      this.decimals,
    );

    return {
      tokenDecimals: this.decimals,
      priceAetto: await this.contract
        .sell_return(countTokenDecimals)
        .then((res) => res.decodedResult),
    };
  }

  async sellReturn(
    count: bigint | string | number,
    denomination?: Denomination,
  ): Promise<string> {
    const { priceAetto } = await this.sellReturnAettoTokenDecimals(
      count,
      denomination,
    );

    return formatAmount(priceAetto.toString(), {
      denomination: AE_AMOUNT_FORMATS.AETTOS,
      targetDenomination: denomination?.denominationAe || AE_AMOUNT_FORMATS.AE,
    });
  }

  async createSellAllowance(
    count: bigint | string | number,
    denomination?: Denomination,
  ): Promise<string> {
    if (!this.decimals) {
      const tokenMetaInfo = await this.tokenContractInstance()
        .then((tokenContract) => tokenContract.meta_info())
        .then((res) => res.decodedResult);

      this.decimals = tokenMetaInfo.decimals;
    }

    const countTokenDecimals = toTokenDecimals(
      count,
      denominationTokenDecimals(denomination),
      this.decimals,
    );

    await this.tokenContractInstance().then(async (tokenContract) => {
      const forAccount = this.address.replaceAll(
        "ct_",
        "ak_",
      ) as Encoded.AccountAddress;

      await createOrChangeAllowance(
        this.aeSdk,
        tokenContract,
        forAccount,
        countTokenDecimals,
      );
    });

    return countTokenDecimals;
  }

  async sellWithExistingAllowance(
    countTokenDecimals: string,
    slippagePercent: bigint | string | number = 3n,
  ): Promise<bigint> {
    const sellReturn = await this.contract
      .sell_return(countTokenDecimals)
      .then((res) => res.decodedResult);

    const requiredReturnWithSlippage = new BigNumber(sellReturn.toString())
      .minus(
        new BigNumber(sellReturn.toString())
          .times(slippagePercent.toString())
          .div(100),
      )
      .toFixed(0);

    return this.contract
      .sell(countTokenDecimals, requiredReturnWithSlippage, {
        omitUnknown: true,
      })
      .then((res) => res.decodedResult);
  }

  async sell(
    count: bigint | string | number,
    denomination?: Denomination,
    slippagePercent: bigint | string | number = 3n,
  ): Promise<bigint> {
    const countTokenDecimals = await this.createSellAllowance(
      count,
      denomination,
    );

    return await this.sellWithExistingAllowance(
      countTokenDecimals,
      slippagePercent,
    );
  }
}
