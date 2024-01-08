require("dotenv").config("./.env");
import { ContractTransactionResponse, TransactionResponse } from "ethers-6";
import { beforeAll, describe, expect, test } from "vitest";
import { Orbiter } from "../orbiter";
import { ILoopringResponse, IToken, TStarknetResponse } from "../types";

describe("orbiter tests", () => {
  // add your private key to the environment to be able to run the tests
  const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
  const STARKNET_PRIVATE_KEY = process.env.STARKNET_PRIVATE_KEY || "";
  const STARKNET_ADDRESS = process.env.STARKNET_ADDRESS || "";
  // rpcs
  const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
  const SN_GOERLI_RPC_URL = process.env.SN_GOERLI_RPC_URL;

  let orbiter: Orbiter;
  beforeAll(async () => {
    if (!PRIVATE_KEY)
      throw new Error(
        "private key can not be empty, pls add your private to the environment to be able to run the tests"
      );
    orbiter = new Orbiter({
      isMainnet: false,
      dealerId: "",
      // default type is EVM
      evmConfig: {
        privateKey: PRIVATE_KEY,
        providerUrl: GOERLI_RPC_URL || "",
      },
      starknetConfig: {
        privateKey: STARKNET_PRIVATE_KEY,
        providerUrl: SN_GOERLI_RPC_URL || "",
        starknetAddress: STARKNET_ADDRESS,
      },
      loopringConfig: {
        privateKey: PRIVATE_KEY,
        providerUrl: GOERLI_RPC_URL || "",
      },
    });
  });

  test("refund starknet account is not match with the source chain test", async () => {
    const starknetRefundConfig = {
      fromChainId: "SN_GOERLI",
      to: "0x031eEf042A3C888287416b744eC5aaAb14E5994F9d88cF7b7a08D78748B077d1",
      token: "ETH",
      amount: 0.01,
    };
    let result;
    try {
      result = await orbiter.toRefund<TStarknetResponse>(starknetRefundConfig);
    } catch (error: any) {
      expect(error.message).eq(
        "current signer is not match with the source chain."
      );
    }
  });

  test("refund evm eth test", async () => {
    const evmRefundOptions = {
      fromChainId: "5",
      to: "0x15962f38e6998875F9F75acDF8c6Ddc743F11041",
      token: "ETH",
      amount: 0.01,
    };
    let result;
    try {
      result = await orbiter.toRefund<TransactionResponse>(evmRefundOptions);
      console.log(result.hash, "evm refund");
      expect(Object.keys(result).length).gt(0);
      expect(result.hash).toBeDefined();
    } catch (error: any) {
      console.log(error);
    }
  });

  test("refund evm erc20 test", async () => {
    const evmRefundOptions = {
      fromChainId: "5",
      to: "0x15962f38e6998875F9F75acDF8c6Ddc743F11041",
      token: "USDC",
      amount: 5,
    };
    let result;
    try {
      result = await orbiter.toRefund<ContractTransactionResponse>(
        evmRefundOptions
      );
      console.log(result.hash, "evm erc20 refund");
      expect(Object.keys(result).length).gt(0);
      expect(result.hash).toBeDefined();
    } catch (error: any) {
      console.log(error);
    }
  });

  test("refund starknet test", async () => {
    const starknetRefundOptions = {
      fromChainId: "SN_GOERLI",
      to: "0x031eEf042A3C888287416b744eC5aaAb14E5994F9d88cF7b7a08D78748B077d1",
      token:
        "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
      amount: 0.01,
    };
    let result;
    try {
      result = await orbiter.toRefund<TStarknetResponse>(starknetRefundOptions);
      expect(result).toBeDefined();
      expect(Object.keys(result).length).gt(0);
    } catch (error: any) {
      console.log(error);
    }
  });

  test("refund loopring test", async () => {
    const tokenInfo: IToken = await orbiter.queryToken("loopring_test", "ETH");
    const { address } = tokenInfo;
    expect(address).toBeDefined();
    const loopringRefundOptions = {
      fromChainId: "loopring_test",
      to: "0x4cd8349054bd6f4d1f3384506d0b3a690d543954",
      token: address,
      amount: 0.01,
    };
    let result;
    try {
      result = await orbiter.toRefund<ILoopringResponse>(loopringRefundOptions);
      console.log(result.hash, "loopring hash");
      expect(result.hash).toBeDefined();
    } catch (error: any) {
      console.log(error);
    }
  });
});
