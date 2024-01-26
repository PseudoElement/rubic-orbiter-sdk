require("dotenv").config("./.env");
import { beforeAll, describe, expect, test } from "vitest";
import { Orbiter } from "../orbiter";
import {
  ILoopringResponse,
  TStarknetResponse,
  TContractTransactionResponse,
  TIMXTransactionResponse,
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

  let orbiter: Orbiter;

  beforeAll(() => {
    if (!PRIVATE_KEY)
      throw new Error(
        "private key can not be empty, pls add your private to the environment to be able to run the tests"
      );
    orbiter = new Orbiter();
    orbiter.updateConfig({
      isMainnet: false,
      dealerId: "",
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

  // xvm cross by different address or different token
  test("xvm ETH cross to op test", async () => {
    const xvmCrossConfig = {
      fromChainID: "5",
      fromCurrency: "ETH",
      toChainID: "420",
      toCurrency: "ETH",
      transferValue: 0.001,
      // add crossAddressReceipt: owner For test xvm
      crossAddressReceipt: "0x4cd8349054Bd6F4d1f3384506D0B3A690D543954",
    };
    let result;
    try {
      result = await orbiter.toBridge<TContractTransactionResponse>(
        xvmCrossConfig
      );
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result && result.hash, "xvmEthHash");
    expect(result && result.hash).toBeDefined();
  });

  test("xvm ERC20 cross test", async () => {
    const xvmCrossConfig = {
      fromChainID: "5",
      fromCurrency: "USDC",
      toChainID: "420",
      toCurrency: "USDC",
      transferValue: 1,
      // add crossAddressReceipt: owner For test xvm
      crossAddressReceipt: "0x4cd8349054Bd6F4d1f3384506D0B3A690D543954",
    };
    let result;
    try {
      result = await orbiter.toBridge<TContractTransactionResponse>(
        xvmCrossConfig
      );
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result && result.hash, "xvmERC20Hash");
    expect(result && result.hash).toBeDefined();
  });

  test("evm ERC20 to ETH cross test", async () => {
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
    expect(result && result.hash).toBeDefined();
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
    console.log(result && result.hash, "evmETHHash");
    expect(result && result.hash).toBeDefined();
  });

  // zksync-lite is temporarily offline
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
      result = await orbiter.toBridge(zksyncCrossConfig);
    } catch (error: any) {
      console.log(error.message);
      expect(
        error.message.includes(
          "zksync lite has some questions to be resolved and will be opened after they are fixed"
        )
      ).toBeTruthy();
    }
  });

  test("loopring ETH cross test", async () => {
    const loopringCrossConfig = {
      fromChainID: "loopring_test",
      fromCurrency: "ETH",
      toChainID: "5",
      toCurrency: "ETH",
      transferValue: 0.001,
    };
    const result = await orbiter.toBridge<ILoopringResponse>(
      loopringCrossConfig
    );
    console.log(result.hash, "loopring hash");
    expect(result.hash).toBeDefined();
  });

  test("starknet ETH cross to goerli test", async () => {
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
      result = await orbiter.toBridge<TStarknetResponse>(starknetCrossConfig);
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
    console.log(result && result.hash, "transfer to starknet hash");
    expect(result && result.hash).toBeDefined();
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
    orbiter.updateConfig({
      evmConfig: {
        privateKey: PRIVATE_KEY,
        providerUrl: OP_GOERLI_RPC_URL || "",
      },
    });
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
    console.log(result && result.hash, "evm erc20 hash");
    expect(result && result.hash).toBeDefined();
  });

  test("evm signer is not match with the source chain test", async () => {
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
        "current signer is not match with the source chain."
      );
    }
  });

  test("starknet account is not match with the source chain test", async () => {
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
        "current signer is not match with the source chain."
      );
    }
  });
});
