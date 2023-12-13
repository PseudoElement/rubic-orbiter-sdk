import { describe, expect, test } from "vitest";
import Orbiter from "../orbiter";

describe("token tests", () => {
  let orbiter: Orbiter = new Orbiter();

  test("get all chain tokens test", async () => {
    const result = await orbiter.getAllChainTokensAsync();
    expect(Object.keys(result).length).gt(0);
  });

  test("get tokens by chainId test", async () => {
    const result = await orbiter.getTokensByChainIdAsync(5);
    expect(Object.keys(result).length).gt(0);
  });

  test("get token decimals test", async () => {
    const goerliUSDCDecimalByName = await orbiter.getTokensDecimals(5, "USDC");
    expect(goerliUSDCDecimalByName).eq(6);

    const goerliUSDCDecimalBySymbol = await orbiter.getTokensDecimals(
      5,
      "USDT"
    );
    expect(goerliUSDCDecimalBySymbol).eq(6);

    const goerliUSDCDecimalByAddress = await orbiter.getTokensDecimals(
      5,
      "0x5da066443180476e8f113546a0d112517d0d4915"
    );
    expect(goerliUSDCDecimalByAddress).eq(6);

    const errorResult = await orbiter.getTokensDecimals(
      5555555,
      "0x5da066443180476e8f11222"
    );
    expect(errorResult).toBeUndefined();
  });

  test("get tokens decimals test", async () => {
    const tokensDecimals = (await orbiter.getTokensDecimals(5, [
      "USDC",
      "0x42c7013dfe01a9a431903fe36523690cbe571b7e",
    ])) as object;
    expect(tokensDecimals).toBeDefined();
    expect(Object.keys(tokensDecimals).length).eq(2);
  });
});
