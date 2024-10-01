export interface CreateCommunityOptions {
  initialBuyCount: bigint | string | number;
  metaInfo: Map<string, string>;
  token: { name: string };
}
