import { describe, expect, test } from "vitest";
import { Orbiter } from "../orbiter";

describe("receive value tests", () => {
  let orbiter: Orbiter = new Orbiter({
    isMainnet: true,
  });

  test("get receive value", async () => {
    const ruleConfig = {
      line: "1/324-ETH/ETH",
      endpoint: "0x80C67432656d59144cEFf962E8fAF8926599bCF8",
      endpointContract: undefined,
      srcChain: "1",
      tgtChain: "324",
      srcToken: "0x0000000000000000000000000000000000000000",
      tgtToken: "0x0000000000000000000000000000000000000000",
      maxAmt: "10",
      minAmt: "0.001",
      tradeFee: "0",
      withholdingFee: "0.0021",
      vc: "9014",
      state: "available",
      compRatio: 1,
      spentTime: 60,
    };
    const result = await orbiter.queryRealSendAmount({
      ruleConfig,
      transferValue: 5,
    });
    console.log(result);
  });
});
