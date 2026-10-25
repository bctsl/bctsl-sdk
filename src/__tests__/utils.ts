import { expect } from "vitest";

import { MemoryAccount } from "@aeternity/aepp-sdk";

export function generateKeyPair() {
  const account = MemoryAccount.generate();
  return { publicKey: account.address, secretKey: account.secretKey };
}

function expectMapsEqual(
  map1: Map<unknown, unknown>,
  map2: Map<unknown, unknown>,
) {
  expect([...map1.entries()].sort()).toEqual([...map2.entries()].sort());
}

export function expectObjectWithMapsEqual(obj1: object, obj2: object) {
  const actual = obj1 as Record<string, unknown>;
  const expected = obj2 as Record<string, unknown>;

  for (const key in actual) {
    if (actual[key] instanceof Map && expected[key] instanceof Map) {
      expectMapsEqual(actual[key], expected[key]);
    } else {
      expect(actual[key]).toEqual(expected[key]);
    }
  }
}
