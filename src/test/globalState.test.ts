import { beforeAll, describe, expect, test } from "vitest";
import Orbiter from "../orbiter";

describe.only("globalState tests", () => {
  let orbiter: Orbiter;

  beforeAll(async () => {
    orbiter = new Orbiter();
  });

  test("setGlobalState test", async () => {
    const currentGlobalState = orbiter.getGlobalState();
    expect(currentGlobalState.isMainnet).toBeFalsy();

    orbiter.updateConfig({ isMainnet: true });
    expect(currentGlobalState.isMainnet).toBeTruthy();

    // test mainnet info
    const mainnetChainInfo = (await orbiter.getChainsAsync())?.some(
      (v) => v.chainId === "1"
    );
    expect(mainnetChainInfo).toBeTruthy();

    const mainnetTokensInfo = (await orbiter.getTokensAllChainAsync())["1"];
    expect(mainnetTokensInfo?.length).gt(0);

    const mainnetRules = (await orbiter.queryRulesAsync()).some(
      (v) => v.line === "1/534352-ETH/ETH"
    );
    expect(mainnetRules).toBeTruthy();
  });
});
