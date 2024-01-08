import { beforeAll, describe, expect, test } from "vitest";
import { Orbiter } from "../orbiter";

describe("globalState tests", () => {
  let orbiter: Orbiter;

  beforeAll(async () => {
    orbiter = new Orbiter();
  });

  test("setGlobalState test", async () => {
    const currentGlobalState = orbiter.getGlobalState();
    expect(currentGlobalState.isMainnet).toBeTruthy();

    // test mainnet info
    const mainnetChainInfo = (await orbiter.queryChains())?.some(
      (v) => v.chainId === "1"
    );
    expect(mainnetChainInfo).toBeTruthy();

    const mainnetTokensInfo = (await orbiter.queryTokensAllChain())["1"];
    expect(mainnetTokensInfo?.length).gt(0);

    const mainnetRules = (await orbiter.queryRouters()).some(
      (v) => v.line === "1/534352-ETH/ETH"
    );
    expect(mainnetRules).toBeTruthy();

    orbiter.updateConfig({ isMainnet: false });
    expect(currentGlobalState.isMainnet).toBeFalsy();
  });
});
