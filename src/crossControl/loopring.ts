// import {
//   ExchangeAPI,
//   GlobalAPI,
//   ConnectorNames,
//   ChainId,
//   generateKeyPair,
//   UserAPI,
//   sleep,
//   AccountInfo,
// } from "@loopring-web/loopring-sdk";
// import Web3 from "web3";
// import config from "../constant/config";
// import { CHAIN_ID_MAINNET } from "../constant/common";
// import axios from "axios";
// import { getRpcList } from "../utils";
// import { IChainInfo } from "../types";

// const getNetworkId = (fromChainID: string) => {
//   return fromChainID === CHAIN_ID_MAINNET.loopring
//     ? ChainId.MAINNET
//     : ChainId.GOERLI;
// };

// export default {
//   getUserAPI: function (fromChainID: string) {
//     return new UserAPI({ chainId: getNetworkId(fromChainID) });
//   },

//   getExchangeAPI: function (fromChainID: string) {
//     return new ExchangeAPI({ chainId: getNetworkId(fromChainID) });
//   },
//   async getLpTokenInfoOnce(fromChainID: string, tokenAddress: string) {
//     const url = `${
//       fromChainID === CHAIN_ID_MAINNET.loopring
//         ? config.loopring.Rinkeby
//         : config.loopring.Mainnet
//     }/api/v3/exchange/tokens`;
//     try {
//       const response = await axios.get(url);
//       if (response.status === 200 && response?.data) {
//         console.log(response, "responseresponseresponse");
//         return response.data.find((item) => item.address == tokenAddress);
//       } else {
//         throw new Error(
//           "Loopring transfer is failed by getLpTokenInfo function."
//         );
//       }
//     } catch (error: any) {
//       throw new Error(
//         `Loopring transfer is error by getLpTokenInfo function. = ${error.message}`
//       );
//     }
//   },
//   async getLpTokenInfo(fromChainID: string, tokenAddress: string, count = 10) {
//     const theLpTokenInfo = this.getLpTokenInfoOnce(fromChainID, tokenAddress);
//     if (theLpTokenInfo) {
//       return theLpTokenInfo;
//     } else {
//       await sleep(100);
//       count--;
//       if (count > 0) {
//         await this.getLpTokenInfo(fromChainID, tokenAddress, count);
//       } else {
//         return 0;
//       }
//     }
//   },

//   accountInfo: async function (
//     address: string,
//     fromChainID: string
//   ): Promise<{ accountInfo: AccountInfo; code: number } | any> {
//     try {
//       const exchangeApi = this.getExchangeAPI(fromChainID);
//       const response: { accountInfo: AccountInfo; code: number } | any =
//         await exchangeApi.getAccount({ owner: address });
//       if (response.accInfo && response.raw_data) {
//         const info = {
//           accountInfo: response.accInfo,
//           code: 0,
//         };
//         return info;
//       } else {
//         const info = {
//           code: response?.code,
//           errorMessage:
//             response?.code == 101002 ? "noAccount" : response?.message,
//         };
//         return info;
//       }
//     } catch (error: any) {
//       throw new Error(`get lp accountInfo error:${error.message}`);
//     }
//   },

//   sendTransfer: async function (
//     address: string,
//     fromChainID: string,
//     fromChainInfo: IChainInfo,
//     toAddress: string,
//     tokenAddress: string,
//     amount: string,
//     memo: string
//   ) {
//     const networkId = getNetworkId(fromChainID);
//     const exchangeApi = this.getExchangeAPI(fromChainID);
//     const userApi = this.getUserAPI(fromChainID);
//     const accountResult = await this.accountInfo(address, fromChainID);
//     if (!accountResult) {
//       throw Error("loopring get account error");
//     }
//     let accInfo;
//     if (accountResult.code) {
//       throw Error("Get loopring account error");
//     } else {
//       accInfo = accountResult?.accountInfo;
//     }
//     const accountId = accInfo?.accountId;
//     const info = await userApi?.getCounterFactualInfo({ accountId });
//     const isCounterFactual = !!info?.counterFactualInfo?.walletOwner;

//     if (
//       accInfo.nonce == 0 &&
//       accInfo.keyNonce == 0 &&
//       accInfo.publicKey.x == "" &&
//       accInfo.publicKey.y == "" &&
//       accInfo.keySeed == ""
//     ) {
//       throw Error("account is not activated");
//     }
//     if (accInfo.frozen) {
//       throw Error("User account is frozen");
//     }
//     const { exchangeInfo } = await exchangeApi.getExchangeInfo();
//     const rpcList = await getRpcList(fromChainInfo);

//     const web3 = new Web3(rpcList[0]);
//     const options = {
//       web3: web3.currentProvider,
//       address: accInfo.owner,
//       keySeed:
//         accInfo.keySeed && accInfo.keySeed !== ""
//           ? accInfo.keySeed
//           : GlobalAPI.KEY_MESSAGE.replace(
//               "${exchangeAddress}",
//               exchangeInfo.exchangeAddress
//             ).replace("${nonce}", (accInfo.nonce - 1).toString()),
//       walletType: ConnectorNames.Unknown,
//       chainId: networkId,
//     };
//     if (isCounterFactual) {
//       Object.assign(options, { accountId });
//     }

//     const eddsaKey = await generateKeyPair(options);

//     const GetUserApiKeyRequest = {
//       accountId,
//     };
//     const { apiKey } = await userApi.getUserApiKey(
//       GetUserApiKeyRequest,
//       eddsaKey.sk
//     );
//     if (!apiKey) {
//       throw Error("Get Loopring ApiKey Error");
//     }

//     const lpTokenInfo = await this.getLpTokenInfo(fromChainID, tokenAddress);
//     const GetNextStorageIdRequest = {
//       accountId,
//       sellTokenId: lpTokenInfo.tokenId,
//     };
//     const storageId = await userApi.getNextStorageId(
//       GetNextStorageIdRequest,
//       apiKey
//     );
//     const ts = Math.round(new Date().getTime() / 1000) + 30 * 86400;

//     const OriginTransferRequestV3 = {
//       exchange: exchangeInfo.exchangeAddress,
//       payerAddr: address,
//       payerId: accountId,
//       payeeAddr: toAddress,
//       payeeId: 0,
//       storageId: storageId.offchainId,
//       token: {
//         tokenId: lpTokenInfo.tokenId,
//         volume: amount + "",
//       },
//       maxFee: {
//         tokenId: 0,
//         volume: "94000000000000000",
//       },
//       validUntil: ts,
//       memo,
//     };
//     const response = isCounterFactual
//       ? await userApi.submitInternalTransfer(
//           {
//             request: OriginTransferRequestV3,
//             web3,
//             chainId: networkId,
//             walletType: ConnectorNames.Unknown,
//             eddsaKey: eddsaKey.sk,
//             apiKey,
//             isHWAddr: false,
//           },
//           { accountId, counterFactualInfo: info.counterFactualInfo }
//         )
//       : await userApi.submitInternalTransfer({
//           request: OriginTransferRequestV3,
//           web3,
//           chainId: networkId,
//           walletType: ConnectorNames.Unknown,
//           eddsaKey: eddsaKey.sk,
//           apiKey,
//           isHWAddr: false,
//         });
//     return response;
//   },
// };
