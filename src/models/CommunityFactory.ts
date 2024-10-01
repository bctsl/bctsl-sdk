import { AeSdkBase, Contract, ContractMethodsBase } from "@aeternity/aepp-sdk";
import ContractWithMethods from "@aeternity/aepp-sdk/es/contract/Contract";
import { Encoded } from "@aeternity/aepp-sdk/es/utils/encoder";
import { BondingCurveTokenSale } from "./BondingCurveTokenSale";
import { CurveType } from "./CurveTypes";
import {
  CommunityFactoryNameChars,
  Denomination,
  denominationTokenDecimals,
  estimateInitialBuyPriceAetto,
  initBondingCurveContract,
  tokenContractInstance,
  toTokenDecimals,
} from "../utils";
import COMMUNITY_MANAGEMENT_ACI from "bctsl-contracts/generated/CommunityManagement.aci.json";
import AFFILIATION_TREASURY_ACI from "bctsl-contracts/generated/AffiliationTreasury.aci.json";
import { FactoryType } from "./FactoryTypes";
import { initAffiliationTokenGatingTokenSale } from "../lib";
import { AffiliationTreasury } from "./AffiliationTreasury";
import { BigNumber } from "bignumber.js";

export class CommunityFactory {
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

  async createCollection(
    name: string,
    allowedNameLength: bigint,
    allowedNameChars: CommunityFactoryNameChars,
  ): Promise<string> {
    const createCollection = await this.contract.create_collection(
      name,
      allowedNameLength,
      allowedNameChars, {
        amount: 555 * 10 ** 18,
      }
    );
    return createCollection.decodedResult;
  }

  async createCommunity(
    collectionName: string,
    name: string,
    metaInfo: Map<string, string>,
    initialBuyCount: bigint | string | number,
    denomination?: Denomination,
  ): Promise<BondingCurveTokenSale> {
    const fee = await this.feePercentage();

    const initialBuyTokenDecimals = toTokenDecimals(
      initialBuyCount,
      denominationTokenDecimals(denomination),
      18n,
    );

    const initialBuyPriceAetto =
      initialBuyTokenDecimals === "0"
        ? "0"
        : await estimateInitialBuyPriceAetto(
            this.aeSdk,
            initialBuyCount,
            await this.bondingCurveAddress(),
            denomination,
            fee,
          );

    const bondingCurveDeployAndBuy = await this.contract.create_community(
      collectionName,
      name,
      initialBuyTokenDecimals,
      false,
      metaInfo,
      { amount: initialBuyPriceAetto },
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [daoAddress, tokenSaleAddress, communityManagementAddress] =
      bondingCurveDeployAndBuy.decodedResult;
    return initAffiliationTokenGatingTokenSale(this.aeSdk, tokenSaleAddress);
  }

  async listRegisteredTokens(
    name: string,
  ): Promise<Map<string, Encoded.ContractAddress>> {
    return this.contract
      .token_sale_registry(name)
      .then((res) => res.decodedResult);
  }

  async getCommunityManagementContract(
    tokenSaleAddress: Encoded.ContractAddress,
  ): Promise<Contract<ContractMethodsBase>> {
    const address = await this.contract
      .get_community_management(tokenSaleAddress)
      .then((res) => res.decodedResult);

    return await this.aeSdk.initializeContract({
      aci: COMMUNITY_MANAGEMENT_ACI,
      address,
    });
  }

  async bondingCurveAddress(): Promise<Encoded.ContractAddress> {
    return this.contract.bonding_curve().then((res) => res.decodedResult);
  }

  async bondingCurveContract(): Promise<{
    instance: Contract<ContractMethodsBase>;
    type: CurveType;
  }> {
    const address = await this.bondingCurveAddress();

    return initBondingCurveContract(this.aeSdk, address);
  }

  async version(): Promise<bigint> {
    return this.contract.version().then((res) => res.decodedResult);
  }

  async protocolDAOTokenInstance(): Promise<
    ContractWithMethods<ContractMethodsBase>
  > {
    return this.contract
      .protocol_dao_token()
      .then((res) => tokenContractInstance(this.aeSdk, res.decodedResult));
  }

  async type(): Promise<FactoryType | null> {
    if (typeof this.contract.fee_percentage !== "function") return null;
    return await this.contract.factory_type().then((res) => {
      if (!Object.values(FactoryType).includes(res.decodedResult))
        throw Error("contract factory type doesn't match sdk factory types");
      return res.decodedResult as FactoryType;
    });
  }

  async affiliationTreasury(): Promise<AffiliationTreasury> {
    const address = await this.contract
      .affiliation_treasury()
      .then((res) => res.decodedResult);

    return new AffiliationTreasury(
      await this.aeSdk.initializeContract({
        aci: AFFILIATION_TREASURY_ACI,
        address,
      }),
      this.aeSdk,
    );
  }

  async feePercentage(): Promise<number> {
    if (typeof this.contract.fee_percentage !== "function") return undefined;

    return new BigNumber(
      await this.contract.fee_percentage().then((res) => res.decodedResult),
    )
      .dividedBy(
        await this.contract.fee_precision().then((res) => res.decodedResult),
      )
      .toNumber();
  }
}
