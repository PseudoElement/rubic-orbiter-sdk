import { describe, expect, test } from "vitest";
import { Orbiter } from "../orbiter";

describe("token tests", () => {
  let orbiter: Orbiter = new Orbiter({
    isMainnet: false,
  });

  test("get all chain tokens test", async () => {
    const result = await orbiter.queryTokensAllChain();
    expect(Object.keys(result).length).gt(0);
  });

  test("get tokens by chainId test", async () => {
    const result = await orbiter.queryTokensByChainId(5);
    expect(Object.keys(result).length).gt(0);
  });

  test("get token decimals test", async () => {
    const goerliUSDCDecimalByName = await orbiter.queryTokensDecimals(5, "ETH");
    expect(goerliUSDCDecimalByName).eq(18);

    const goerliUSDCDecimalBySymbol = await orbiter.queryTokensDecimals(
      5,
      "ETH"
    );
    expect(goerliUSDCDecimalBySymbol).eq(18);

    const goerliUSDCDecimalByAddress = await orbiter.queryTokensDecimals(
      5,
      "0x0000000000000000000000000000000000000000"
    );
    expect(goerliUSDCDecimalByAddress).eq(18);

    const errorResult = await orbiter.queryTokensDecimals(
      5555555,
      "0x5da066443180476e8f11222"
    );
    expect(errorResult).toBeUndefined();
  });

  test("get tokens decimals test", async () => {
    const tokensDecimals = (await orbiter.queryTokensDecimals(5, [
      "ETH",
      "0x0000000000000000000000000000000000000000",
    ])) as object;
    expect(tokensDecimals).toBeDefined();
    expect(Object.keys(tokensDecimals).length).eq(2);
    expect(tokensDecimals["ETH" as keyof typeof tokensDecimals]).eq(18);
    expect(
      tokensDecimals[
        "0x0000000000000000000000000000000000000000" as keyof typeof tokensDecimals
      ]
    ).eq(18);
  });
});
