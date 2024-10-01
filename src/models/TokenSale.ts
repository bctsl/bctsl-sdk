import ContractWithMethods from "@aeternity/aepp-sdk/es/contract/Contract";
import {
  AE_AMOUNT_FORMATS,
  AeSdkBase,
  ContractMethodsBase,
  formatAmount,
} from "@aeternity/aepp-sdk";
import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import {
  denominationTokenDecimals,
  initDAO,
  MetaInfo,
  toTokenDecimals,
} from "../index";
import { SaleType } from "./SaleTypes";
import { Denomination, tokenContractInstance } from "../utils";
import { DAO } from "./DAO";
import { BigNumber } from "bignumber.js";

export class TokenSale {
  contract: ContractWithMethods<ContractMethodsBase>;
  aeSdk: AeSdkBase;
  address: Encoded.ContractAddress;

  private tokenInstance?: ContractWithMethods<ContractMethodsBase>;
  protected tokenContractAddress?: Encoded.ContractAddress;
  protected decimals?: bigint;

  constructor(
    contract: ContractWithMethods<ContractMethodsBase>,
    aeSdk: AeSdkBase,
  ) {
    this.contract = contract;
    this.address = contract.$options.address;
    this.aeSdk = aeSdk;
  }

  async saleType(): Promise<SaleType> {
    return this.contract.sale_type().then((res) => {
      if (!Object.values(SaleType).includes(res.decodedResult))
        throw Error("contract sale type doesn't match sdk sale type");
      return res.decodedResult as SaleType;
    });
  }

  async version(): Promise<bigint> {
    return this.contract.version().then((res) => res.decodedResult);
  }

  async owner(): Promise<Encoded.AccountAddress> {
    return this.contract.owner().then((res) => res.decodedResult);
  }

  async tokenContractInstance(): Promise<
    ContractWithMethods<ContractMethodsBase>
  > {
    if (this.tokenInstance) return this.tokenInstance;
    if (!this.tokenContractAddress) {
      this.tokenContractAddress = await this.contract
        .token_contract()
        .then((res) => res.decodedResult);
    }

    return tokenContractInstance(this.aeSdk, this.tokenContractAddress);
  }

  protected async stateAndMetaInfo() {
    const state = await this.contract
      .get_state()
      .then((res) => res.decodedResult);
    this.tokenContractAddress = state.tokenContract;

    const tokenMetaInfo = await this.tokenContractInstance()
      .then((tokenContract) => tokenContract.meta_info())
      .then((res) => res.decodedResult);
    this.decimals = tokenMetaInfo.decimals;

    return { state, tokenMetaInfo };
  }

  private async priceAettoTokenDecimals(
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
        .price(countTokenDecimals)
        .then((res) => res.decodedResult),
    };
  }

  async price(
    count: bigint | string | number,
    denomination?: Denomination,
  ): Promise<string> {
    const { priceAetto } = await this.priceAettoTokenDecimals(
      count,
      denomination,
    );

    return formatAmount(priceAetto.toString(), {
      denomination: AE_AMOUNT_FORMATS.AETTOS,
      targetDenomination: denomination?.denominationAe || AE_AMOUNT_FORMATS.AE,
    });
  }

  async buy(
    count: bigint | string | number,
    denomination?: Denomination,
    slippagePercent: bigint | string | number = 3n,
  ): Promise<void> {
    const { tokenDecimals, priceAetto } = await this.priceAettoTokenDecimals(
      count,
      denomination,
    );

    const countTokenDecimals = toTokenDecimals(
      count,
      denominationTokenDecimals(denomination),
      tokenDecimals,
    );

    const priceAettoWithSlippage = new BigNumber(priceAetto.toString())
      .plus(
        new BigNumber(priceAetto.toString())
          .times(slippagePercent.toString())
          .div(100),
      )
      .toFixed(0);

    return this.contract
      .buy(countTokenDecimals, {
        amount: priceAettoWithSlippage,
        omitUnknown: true,
      })
      .then((res) => res.decodedResult);
  }

  async checkAndGetDAO(): Promise<DAO> {
    const owner = await this.owner();

    return initDAO(
      this.aeSdk,
      owner.replace("ak_", "ct_") as Encoded.ContractAddress,
    );
  }

  async metaInfo(): Promise<MetaInfo> {
    const { state, tokenMetaInfo } = await this.stateAndMetaInfo();

    return {
      owner: state.owner,
      token: {
        address: state.token_contract,
        decimals: tokenMetaInfo.decimals,
        name: tokenMetaInfo.name,
        symbol: tokenMetaInfo.symbol,
      },
    };
  }
}
