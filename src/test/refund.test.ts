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
      expect(error.message).eq(
        "evm signer is not match with the source chain."
      );
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

  test.only("refund evm test", async () => {
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
});
