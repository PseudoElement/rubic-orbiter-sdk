require("dotenv").config("./.env");
import {
  Provider,
  Signer,
  TransactionResponse,
  Wallet,
  ethers,
} from "ethers-6";
import { beforeAll, describe, expect, test } from "vitest";
import Orbiter from "../orbiter";
import { Account, RpcProvider as snProvider } from "starknet";
import { IToken } from "../types";

describe("orbiter tests", () => {
  // add your private key to the environment to be able to run the tests
  const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
  const STARKNET_PRIVATE_KEY = process.env.STARKNET_PRIVATE_KEY || "";
  const STARKNET_ADDRESS = process.env.STARKNET_ADDRESS || "";
  // rpcs
  const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
  const OP_GOERLI_RPC_URL = process.env.OP_GOERLI_RPC_URL;
  const SN_GOERLI_RPC_URL = process.env.SN_GOERLI_RPC_URL;

  let signer: Signer;
  let orbiter: Orbiter;
  let provider: Provider;
  let owner: string;

  beforeAll(async () => {
    if (!PRIVATE_KEY)
      throw new Error(
        "private key can not be empty, pls add your private to the environment to be able to run the tests"
      );
    orbiter = new Orbiter();
    const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL);
    provider = goerliProvider;
    signer = new Wallet(PRIVATE_KEY, goerliProvider);
    orbiter.updateConfig({ signer });
    owner = await signer.getAddress();
  });

  test("refund evm signer is not match with the source chain test", async () => {
    const opProvider = new ethers.JsonRpcProvider(OP_GOERLI_RPC_URL);
    provider = opProvider;
    const opSigner = signer.connect(provider);
    orbiter.updateConfig({ signer: opSigner });
    const evmRefundOptions = {
      fromChainId: "5",
      to: "0x15962f38e6998875F9F75acDF8c6Ddc743F11041",
      token: "ETH",
      amount: 0.01,
    };
    let result;
    try {
      result = await orbiter.toRefund(evmRefundOptions);
    } catch (error: any) {
      expect(
        error.message.includes("evm signer is not match with the source chain.")
      ).toBeTruthy();
    }
  });

  test("refund starknet account is not match with the source chain test", async () => {
    const provider = new snProvider({ nodeUrl: SN_GOERLI_RPC_URL || "" });
    const account = new Account(
      provider,
      STARKNET_ADDRESS,
      STARKNET_PRIVATE_KEY
    );
    orbiter.updateConfig({ signer: account });

    const starknetRefundConfig = {
      fromChainId: "SN_GOERLI",
      to: "0x15962f38e6998875F9F75acDF8c6Ddc743F11041",
      token: "ETH",
      amount: 0.01,
    };
    let result;
    try {
      result = await orbiter.toRefund(starknetRefundConfig);
    } catch (error: any) {
      expect(error.message).eq(
        "starknet account is not match with the source chain."
      );
    }
  });

  test("refund evm test", async () => {
    const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL);
    provider = goerliProvider;
    const goerliSigner = signer.connect(provider);
    orbiter.updateConfig({ signer: goerliSigner });

    const evmRefundOptions = {
      fromChainId: "5",
      to: "0x15962f38e6998875F9F75acDF8c6Ddc743F11041",
      token: "ETH",
      amount: 0.01,
    };
    let result: TransactionResponse;
    try {
      result = await orbiter.toRefund(evmRefundOptions);
      console.log(result.hash, "evm refund");
      expect(Object.keys(result).length).gt(0);
      expect(result.hash).toBeDefined();
    } catch (error: any) {
      console.log(error);
    }
  });

  test("refund starknet test", async () => {
    const provider = new snProvider({ nodeUrl: SN_GOERLI_RPC_URL || "" });
    const account = new Account(
      provider,
      STARKNET_ADDRESS,
      STARKNET_PRIVATE_KEY
    );
    orbiter.updateConfig({ signer: account });

    const starknetRefundOptions = {
      fromChainId: "SN_GOERLI",
      to: "0x031eEf042A3C888287416b744eC5aaAb14E5994F9d88cF7b7a08D78748B077d1",
      token:
        "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
      amount: 0.01,
    };
    let result: TransactionResponse;
    try {
      result = await orbiter.toRefund(starknetRefundOptions);
      console.log(result, "evm refund");
      expect(result).toBeDefined();
      expect(Object.keys(result).length).gt(0);
    } catch (error: any) {
      console.log(error);
    }
  });

  test.only("refund loopring test", async () => {
    orbiter.generateLoopringSignerAndSetGlobalState(
      PRIVATE_KEY,
      GOERLI_RPC_URL
    );
    const tokenInfo: IToken = await orbiter.getTokenAsync(
      "loopring_test",
      "ETH"
    );
    const { address } = tokenInfo;
    expect(address).toBeDefined();
    const loopringRefundOptions = {
      fromChainId: "loopring_test",
      to: "0x4cd8349054bd6f4d1f3384506d0b3a690d543954",
      token: address,
      amount: 0.01,
      isLoopring: true,
    };
    let result: TransactionResponse;
    try {
      result = await orbiter.toRefund(loopringRefundOptions);
      console.log(result.hash, "loopring hash");
      expect(result.hash).toBeDefined();
    } catch (error: any) {
      console.log(error);
    }
  });
});
