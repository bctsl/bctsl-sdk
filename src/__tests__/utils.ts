import { expect } from "vitest";

import { MemoryAccount } from "@aeternity/aepp-sdk";

export function generateKeyPair() {
  const account = MemoryAccount.generate();
  return { publicKey: account.address, secretKey: account.secretKey };
}

function expectMapsEqual(map1: Map<any, any>, map2: Map<any, any>) {
  expect([...map1.entries()].sort()).toEqual([...map2.entries()].sort());
}

export function expectObjectWithMapsEqual(obj1: any, obj2: any) {
  for (const key in obj1) {
    if (obj1[key] instanceof Map && obj2[key] instanceof Map) {
      expectMapsEqual(obj1[key], obj2[key]);
    } else {
      expect(obj1[key]).toEqual(obj2[key]);
    }
  }
}
