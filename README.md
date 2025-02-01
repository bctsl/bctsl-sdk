
# bctsl-sdk

SDK for interacting with various components of the BCTSL ecosystem, including the community factory, affiliation treasury, community DAO, token sale, and bonding curve contracts.  
The SDK facilitates seamless interaction with the [BCTSL contracts](https://github.com/bctsl/bctsl-contracts).

## Usage

Create a new collection, then a community using the community factory, and finally initialize the token sale from the contract address as a user would.

`$ npm i bctsl/bctsl-sdk`

```typescript
import { initCommunityFactory } from "bctsl-sdk";

const COMMUNITY_FACTORY_CONTRACT_ADDRESS = "ct_2QmAcPxY4TBbFmkSUhxU4UTwoRot8SMmZzaAKL6oyHmQqRL1rK";

const communityFactory = await initCommunityFactory(aeSdk, COMMUNITY_FACTORY_CONTRACT_ADDRESS);

const allowedNameLength = 20;
const allowedNameChars = [
      { SingleChar: [45] }, // -
      { CharRangeFromTo: [48, 57] }, // 0-9
      { CharRangeFromTo: [65, 90] }, // A-Z
];
const collectionName = await communityFactory.createCollection(
      "alphabets",
      allowedNameLength,
      allowedNameChars,
);

const registeredTokens = await communityFactory.listRegisteredTokens(collectionName);
const affiliationTreasury = await communityFactory.affiliationTreasury();
const fee = await communityFactory.feePercentage();

const communityTokenSale = await communityFactory.createCommunity(collectionName, "name", new Map(/* arbitrary meta info key value */), 0 /*initial buy count*/) // optionally pass denomination, default full token, full ae

// initAffiliationTokenGatingTokenSale(aeSdk, communityTokenSaleAddress) can be used to initialize the token sale if needed after its creation

const price = await communityTokenSale.price(1n) // optionally pass denomination, default full token, full ae
const communityDAO = await communityTokenSale.checkAndGetDAO();

await communityTokenSale.buy(2n); // optionally pass denomination, passing string (for float and higher precision) or number is also possible
await communityTokenSale.sell(2n); // optionally pass denomination, passing string (for float and higher precision) or number is also possible

// manage the community
const communityManagement = await communityFactory.getCommunityManagement(communityTokenSale.address);
const meta_info = await communityManagement.meta_info();
```

### Additional Utils

 - `createOrChangeAllowance` to create or update allowance for a given token contract, e.g. to participate in votes or internally used in selling tokens to the bonding curve
 - `estimateInitialBuyPriceAetto` can be used to estimate the initial buy price on a given bonding curve contract without already having an instance for it
 - `initBondingCurveContract` to receive the type and instance for a given bonding curve contract
 - `tokenContractInstance` returns the contract instance for any given AEX-9 token address
 - `deployCommunityFactory` deploy the community factory to be used to access its registry or deploy new sales with it.
 - `initDAO` returns an initialized DAO contract address, to e.g. add votes or apply vote subjects
 - `initDAOVote` initializes a voting contract instance for the passed contract address to vote, revoke or withdraw from it

## Development and Architecture

 - `models/TokenSale.ts` implements the shared logic for the token sale, e.g. fetching price, base metainfo, buying the token or instantiating the token contract itself.
 - `models/BondingCureveTokenSale.ts` extends this implementation which logic specific to that sale type.
 - `lib/bondingCurve.ts` implements creation and initialization utils for this sale type, an sdk instance can be passed by the implementor to interact with the blockchain as required by the use-case.
 - `interfaces/options` includes the interfaces for creation options for token sales, again with base implementation and extension of that for the specific sale type.
 - `interfaces/metaInfo` includes the interfaces for returned meta information for token sales as well as the token information itself, again with base implementation and extension of that for the specific sale type.

## Development and Testing

1. Install aeproject `npm i -g @aeternity/aeproject`
2. Start environment `aeproject env`
3. Install dependencies `npm i`
4. Run tests `npm test`

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2024, BCTSL
