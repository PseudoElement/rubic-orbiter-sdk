import { describe, expect, test } from "vitest";
import { Orbiter } from "../orbiter";

describe("value tests", () => {
  let orbiter: Orbiter = new Orbiter({});

  test("queryReceiveAmount test", async () => {
    const rule = {
      compRatio: 1,
      endpoint: "0xE4eDb277e41dc89aB076a1F049f4a3EfA700bCE8",
      endpointContract: undefined,
      line: "1/10-ETH/ETH",
      maxAmt: "10",
      minAmt: "0.001",
      spentTime: 60,
      srcChain: "1",
      srcToken: "0x0000000000000000000000000000000000000000",
      state: "available",
      tgtChain: "10",
      tgtToken: "0x0000000000000000000000000000000000000000",
      tradeFee: "150",
      vc: "9007",
      withholdingFee: "0.0017",
    };
    const result = await orbiter.queryReceiveAmount(0.001, rule);
    console.log(result);
    expect(result).toBeDefined();
  });
});
