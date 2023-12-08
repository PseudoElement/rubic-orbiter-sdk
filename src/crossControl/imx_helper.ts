import { ImmutableXClient } from "@imtbl/imx-sdk";
import config from "../constant/config";
import { CHAIN_ID_MAINNET, IMX_CONTRACTS } from "../constant/common";

const IMMUTABLEX_CLIENTS: {
  [k: string]: ImmutableXClient;
} = {};

export class IMXHelper {
  publicApiUrl = "";
  starkContractAddress = "";
  registrationContractAddress = "";

  constructor(fromChainID: string) {
    const isMainNet = fromChainID === CHAIN_ID_MAINNET.imx;
    this.publicApiUrl = isMainNet
      ? config.immutableX.Mainnet
      : config.immutableX.Rinkeby;
    this.starkContractAddress = isMainNet
      ? IMX_CONTRACTS.mainnet.starkContractAddress
      : IMX_CONTRACTS.ropsten.starkContractAddress;
    this.registrationContractAddress = isMainNet
      ? IMX_CONTRACTS.mainnet.registrationContractAddress
      : IMX_CONTRACTS.ropsten.registrationContractAddress;
  }

  async getImmutableXClient(
    signer: any,
    addressOrIndex: string,
    alwaysNew: boolean
  ): Promise<ImmutableXClient> {
    const immutableXClientKey = String(addressOrIndex);

    if (
      IMMUTABLEX_CLIENTS[
        immutableXClientKey as keyof typeof IMMUTABLEX_CLIENTS
      ] &&
      !alwaysNew
    ) {
      return IMMUTABLEX_CLIENTS[
        immutableXClientKey as keyof typeof IMMUTABLEX_CLIENTS
      ];
    }

    if (!this.starkContractAddress) {
      throw new Error("Sorry, miss param [starkContractAddress]");
    }
    if (!this.registrationContractAddress) {
      throw new Error("Sorry, miss param [registrationContractAddress]");
    }
    const client = await ImmutableXClient.build({
      publicApiUrl: this.publicApiUrl,
      signer,
      starkContractAddress: this.starkContractAddress,
      registrationContractAddress: this.registrationContractAddress,
    });
    return (IMMUTABLEX_CLIENTS[
      immutableXClientKey as keyof typeof IMMUTABLEX_CLIENTS
    ] = client);
  }
}
