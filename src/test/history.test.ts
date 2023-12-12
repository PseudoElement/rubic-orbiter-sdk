require("dotenv").config("./.env");
import { Provider, Signer, Wallet, ethers } from "ethers-6";
import { beforeAll, describe, expect, test } from "vitest";
import Orbiter from "../orbiter";

describe.only("bridge tests", () => {
  // add your private key to the environment to be able to run the tests
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  let signer: Signer;
  let orbiter: Orbiter;
  let provider: Provider;

  beforeAll(async () => {
    if (!PRIVATE_KEY)
      throw new Error(
        "private key can not be empty, pls add your private to the environment to be able to run the tests"
      );
    orbiter = new Orbiter();
    // const goerliRpcs = await orbiter.getChainInfoAsync(5);
    const goerliProvider = new ethers.JsonRpcProvider(
      "https://goerli.infura.io/v3/e41edd236d664caabcc0b486e4912069"
    );
    // const goerliProvider = new ethers.JsonRpcProvider(goerliRpcs?.rpc?.[0]);
    provider = goerliProvider;
    signer = new Wallet(PRIVATE_KEY, goerliProvider);
    orbiter.updateSigner(signer);
  });

  test("get all history test", async () => {
    const result = await orbiter.getHistoryListAsync({
      pageNum: 10,
      pageSize: 1,
    });
    expect(result).toBeDefined();
    expect(result.transactions.length).gt(0);
  });

  test("searchTransaction test", async () => {
    const goerliToStarknetGoerliHash =
      "0x3638d76871d33e31b4beb2b2b22279df7a8e683cc3eb7ac172787db1cebb23b5";
    const result = await orbiter.searchTransaction(
      goerliToStarknetGoerliHash,
      5
    );
    expect(result).toBeDefined();
    expect(result?.fromHash).is.string;
  });

  test("searchTransaction is not found test", async () => {
    const goerliToStarknetGoerliHash =
      "0x3638d76871d33e31b4beb2b2b22279df7a8e683cc3eb7ac17278233323332333";
    const result = await orbiter.searchTransaction(
      goerliToStarknetGoerliHash,
      5
    );
    expect(result).toBeUndefined();
  });
});
