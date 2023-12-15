require("dotenv").config("./.env");
import { Provider, Signer, Wallet, ethers } from "ethers-6";
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
    let result = null;
    try {
      result = await orbiter.toBridge(xvmCrossConfig);
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result.hash);
    expect(result.hash).toBeDefined;
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
    let result = null;
    try {
      result = await orbiter.toBridge(xvmCrossConfig);
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result.hash);
    expect(result.hash).toBeDefined;
  });

  test("evm ETH cross to op test", async () => {
    const evmCrossConfig = {
      fromChainID: "5",
      fromCurrency: "ETH",
      toChainID: "420",
      toCurrency: "ETH",
      transferValue: 0.001,
    };
    let result = null;
    try {
      result = await orbiter.toBridge(evmCrossConfig);
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result.hash);
    expect(result.hash).toBeDefined;
  });

  test("zksync lite ETH cross to op test", async () => {
    const zksyncCrossConfig = {
      fromChainID: "zksync_test",
      fromCurrency: "ETH",
      toChainID: "420",
      toCurrency: "ETH",
      transferValue: 0.001,
    };
    let result = null;
    try {
      result = await orbiter.toBridge(zksyncCrossConfig);
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result.txHash);
    expect(result.txHash).toBeDefined;
  });

  // test("loopring ETH cross test", async () => {
  //   const loopringCrossConfig = {
  //     fromChainID: "loopring_test",
  //     fromCurrency: "ETH",
  //     toChainID: "420",
  //     toCurrency: "ETH",
  //     transferValue: 0.001,
  //   };
  //   const tx = await orbiter.toBridge(loopringCrossConfig);
  //   console.log(tx.txHash);
  //   expect(tx.txHash).toBeDefined;
  // });

  // test("starknet ETH cross to goerli test", async () => {
  //   const provider = new snProvider({ nodeUrl: SN_GOERLI_RPC_URL || "" });
  //   const account = new Account(
  //     provider,
  //     STARKNET_ADDRESS,
  //     STARKNET_PRIVATE_KEY
  //   );
  //   orbiter.updateConfig({ signer: account});

  //   let result = null;
  //   try {
  //     const starknetCrossConfig = {
  //       fromChainID: "SN_GOERLI",
  //       fromCurrency: "ETH",
  //       toChainID: "5",
  //       toCurrency: "ETH",
  //       transferValue: 0.001,
  //       crossAddressReceipt: "0x15962f38e6998875F9F75acDF8c6Ddc743F11041",
  //     };
  //     result = await orbiter.toBridge(starknetCrossConfig);
  //   } catch (error: any) {
  //     console.log(error.message);
  //   }
  //   console.log(result);
  //   expect(result).toBeDefined;
  // });

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
    let result = null;
    try {
      result = await orbiter.toBridge(starknetCrossConfig);
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result.hash);
    expect(result.hash).toBeDefined;
  });

  test("imx transfer ETH to scroll test", async () => {
    let result = null;
    try {
      const imxCrossConfig = {
        fromChainID: "immutableX_test",
        fromCurrency: "ETH",
        toChainID: "534351",
        toCurrency: "ETH",
        transferValue: 0.001,
      };
      result = await orbiter.toBridge(imxCrossConfig);
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result);
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
    let result = null;
    try {
      result = await orbiter.toBridge(evmCrossConfig);
    } catch (error: any) {
      console.log(error.message);
    }
    console.log(result.hash);
    expect(result.hash).toBeDefined;
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
    let result = null;
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
    let result = null;
    try {
      result = await orbiter.toBridge(evmCrossConfig);
    } catch (error: any) {
      expect(error.message).eq(
        "starknet account is not match with the source chain."
      );
    }
  });
});
