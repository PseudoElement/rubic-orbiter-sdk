require("dotenv").config("./.env");
import { Provider, Signer, Wallet, ethers } from "ethers-6";
import { beforeAll, describe, expect, test } from "vitest";
import Orbiter from "../orbiter";
import { Account, RpcProvider as snProvider } from "starknet";
import {
  ILoopringResponse,
  TContractTransactionResponse,
  TIMXTransactionResponse,
  TTransaction,
  TTransactionResponse,
} from "../types";

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

  // xvm cross by different address or different token
  test("xvm ETH cross to op test", async () => {
    const xvmCrossConfig = {
      fromChainID: "5",
      fromCurrency: "ETH",
      toChainID: "420",
      toCurrency: "ETH",
      transferValue: 0.001,
      // add crossAddressReceipt: owner For test xvm
      crossAddressReceipt: owner,
    };
    let result;
    try {
      result = await orbiter.toBridge<TContractTransactionResponse>(
        xvmCrossConfig
      );
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result, "xvmEth");
    console.log(result && result.hash, "xvmEthHash");
    expect(result && result.hash).toBeDefined;
  });

  test("xvm ERC20 cross test", async () => {
    const xvmCrossConfig = {
      fromChainID: "5",
      fromCurrency: "USDC",
      toChainID: "420",
      toCurrency: "USDC",
      transferValue: 1,
      // add crossAddressReceipt: owner For test xvm
      crossAddressReceipt: owner,
    };
    let result;
    try {
      result = await orbiter.toBridge<TContractTransactionResponse>(
        xvmCrossConfig
      );
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result, "xvmERC20");
    console.log(result && result.hash, "xvmERC20Hash");
    expect(result && result.hash).toBeDefined;
  });

  test.only("ERC20 to ETH cross test", async () => {
    const crossConfig = {
      fromChainID: "5",
      fromCurrency: "USDC",
      toChainID: "420",
      toCurrency: "ETH",
      transferValue: 5,
    };
    let result;
    try {
      result = await orbiter.toBridge<TContractTransactionResponse>(
        crossConfig
      );
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result && result.hash, "ERC20 to ETH");
    expect(result && result.hash).toBeDefined;
  });

  test("evm ETH cross to op test", async () => {
    const evmCrossConfig = {
      fromChainID: "5",
      fromCurrency: "ETH",
      toChainID: "420",
      toCurrency: "ETH",
      transferValue: 0.001,
    };
    let result;
    try {
      result = await orbiter.toBridge<TTransactionResponse>(evmCrossConfig);
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result, "evmETH");
    console.log(result && result.hash, "evmETHHash");
    expect(result && result.hash).toBeDefined;
  });

  test("zksync lite ETH cross to op test", async () => {
    const zksyncCrossConfig = {
      fromChainID: "zksync_test",
      fromCurrency: "ETH",
      toChainID: "420",
      toCurrency: "ETH",
      transferValue: 0.001,
    };
    let result;
    try {
      result = await orbiter.toBridge<TTransaction>(zksyncCrossConfig);
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result, "zksync lite eth");
    console.log(result && result.txHash, "zksync lite hash");
    expect(result && result.txHash).toBeDefined;
  });

  test("loopring ETH cross test", async () => {
    orbiter.generateLoopringSignerAndSetGlobalState(
      PRIVATE_KEY,
      GOERLI_RPC_URL
    );
    const loopringCrossConfig = {
      fromChainID: "loopring_test",
      fromCurrency: "ETH",
      toChainID: "420",
      toCurrency: "ETH",
      transferValue: 0.001,
    };
    const result = await orbiter.toBridge<ILoopringResponse>(
      loopringCrossConfig
    );
    console.log(result.hash, "loopring hash");
    expect(result.hash).toBeDefined;
  });

  test("starknet ETH cross to goerli test", async () => {
    const provider = new snProvider({ nodeUrl: SN_GOERLI_RPC_URL || "" });
    const account = new Account(
      provider,
      STARKNET_ADDRESS,
      STARKNET_PRIVATE_KEY
    );
    orbiter.updateConfig({ signer: account });
    let result;
    try {
      const starknetCrossConfig = {
        fromChainID: "SN_GOERLI",
        fromCurrency: "ETH",
        toChainID: "5",
        toCurrency: "ETH",
        transferValue: 0.001,
        crossAddressReceipt: "0x15962f38e6998875F9F75acDF8c6Ddc743F11041",
      };
      result = await orbiter.toBridge(starknetCrossConfig);
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result);
    expect(result).toBeDefined();
  });

  test("transfer to starknet ETH cross by goerli test", async () => {
    const starknetCrossConfig = {
      fromChainID: "5",
      fromCurrency: "ETH",
      toChainID: "SN_GOERLI",
      toCurrency: "ETH",
      crossAddressReceipt:
        "0x04CC0189A24723B68aEeFf84EEf2c0286a1F03b7AECD14403E130Db011571f37",
      transferValue: 0.001,
    };
    let result;
    try {
      result = await orbiter.toBridge<TContractTransactionResponse>(
        starknetCrossConfig
      );
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result, "transfer to starknet");
    console.log(result && result.hash, "transfer to starknet hash");
    expect(result && result.hash).toBeDefined;
  });

  test("imx transfer ETH to scroll test", async () => {
    let result;
    try {
      const imxCrossConfig = {
        fromChainID: "immutableX_test",
        fromCurrency: "ETH",
        toChainID: "534351",
        toCurrency: "ETH",
        transferValue: 0.001,
      };
      result = await orbiter.toBridge<TIMXTransactionResponse>(imxCrossConfig);
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result, "imx eth");
    expect(result).toBeDefined();
  });

  test("evm erc20 cross test", async () => {
    const opProvider = new ethers.JsonRpcProvider(OP_GOERLI_RPC_URL);
    provider = opProvider;
    const opSigner = signer.connect(provider);
    orbiter.updateConfig({ signer: opSigner });
    const evmCrossConfig = {
      fromChainID: "420",
      fromCurrency: "USDC",
      toChainID: "5",
      toCurrency: "USDC",
      transferValue: 1,
    };
    let result;
    try {
      result = await orbiter.toBridge<TContractTransactionResponse>(
        evmCrossConfig
      );
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result, "evm erc20");
    console.log(result && result.hash, "evm erc20 hash");
    expect(result && result.hash).toBeDefined;
  });

  test("evm signer is not match with the source chain test", async () => {
    const opProvider = new ethers.JsonRpcProvider(OP_GOERLI_RPC_URL);
    provider = opProvider;
    const opSigner = signer.connect(provider);
    orbiter.updateConfig({ signer: opSigner });
    const evmCrossConfig = {
      fromChainID: "5",
      fromCurrency: "USDC",
      toChainID: "420",
      toCurrency: "USDC",
      transferValue: 1,
    };
    let result;
    try {
      result = await orbiter.toBridge(evmCrossConfig);
    } catch (error: any) {
      expect(error.message).eq(
        "evm signer is not match with the source chain."
      );
    }
  });

  test("starknet account is not match with the source chain test", async () => {
    const provider = new snProvider({ nodeUrl: SN_GOERLI_RPC_URL || "" });
    const account = new Account(
      provider,
      STARKNET_ADDRESS,
      STARKNET_PRIVATE_KEY
    );
    orbiter.updateConfig({ signer: account });
    const evmCrossConfig = {
      fromChainID: "5",
      fromCurrency: "USDC",
      toChainID: "420",
      toCurrency: "USDC",
      transferValue: 1,
    };
    let result;
    try {
      result = await orbiter.toBridge(evmCrossConfig);
    } catch (error: any) {
      expect(error.message).eq(
        "starknet account is not match with the source chain."
      );
    }
  });
});
