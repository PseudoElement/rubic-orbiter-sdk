require("dotenv").config("./.env");
import { beforeAll, describe, expect, test } from "vitest";
import { Orbiter } from "../orbiter";

describe("bridge tests", () => {
  // add your private key to the environment to be able to run the tests
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;

  let orbiter: Orbiter;

  beforeAll(async () => {
    if (!PRIVATE_KEY || !GOERLI_RPC_URL)
      throw new Error(
        "private key can not be empty, pls add your private to the environment to be able to run the tests"
      );
    orbiter = new Orbiter({
      isMainnet: false,
    });
  });

  test("get all history test", async () => {
    const result = await orbiter.queryHistoryList({
      account: "0x15962f38e6998875F9F75acDF8c6Ddc743F11041",
      pageNum: 10,
      pageSize: 1,
    });
    expect(result).toBeDefined();
    expect(result.transactions.length).gt(0);
  });

  test("searchTransaction test", async () => {
    const goerliToStarknetGoerliHash =
      "0x3638d76871d33e31b4beb2b2b22279df7a8e683cc3eb7ac172787db1cebb23b5";
    const result = await orbiter.searchTransaction(goerliToStarknetGoerliHash);

    expect(result).toBeDefined();
    expect(result?.sourceId).is.string;
  });

  test("searchTransaction is not found test", async () => {
    const goerliToStarknetGoerliHash = `0x${"3".repeat(64)}`;

    const result = await orbiter.searchTransaction(goerliToStarknetGoerliHash);

    expect(result && Object.keys(result).length).eq(0);
  });
});
