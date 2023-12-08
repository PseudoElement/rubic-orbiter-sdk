import ChainsService from "../services/ChainsService";
import CrossRulesService from "../services/CrossRulesService";
import TokenService from "../services/TokenService";
import CrossControl from "../crossControl";
import { IOBridgeConfig, ITransferConfig } from "../types";
import { Signer } from "ethers-6";
import { throwNewError } from "../utils";
import { Account } from "starknet";

export default class OBridge {
  private signer: Signer | Account | any;
  private chainsService: ChainsService;
  private tokensService: TokenService;
  private crossRulesService: CrossRulesService;
  private crossControl: CrossControl;

  constructor(config: IOBridgeConfig) {
    this.signer = config.signer;
    this.chainsService = ChainsService.getInstance();
    this.tokensService = TokenService.getInstance();
    this.crossRulesService = CrossRulesService.getInstance();
    this.crossControl = CrossControl.getInstance();
  }

  public updateSigner(signer: Signer | Account): void {
    this.signer = signer;
  }

  public getChainsService() {
    return this.chainsService;
  }

  public getTokensService() {
    return this.tokensService;
  }

  public getCrossRulesService() {
    return this.crossRulesService;
  }

  public async toBridge(transferConfig: ITransferConfig) {
    if (!this.signer) throw new Error("Can not find signer, please check it!");
    const {
      fromChainID,
      fromCurrency,
      toChainID,
      toCurrency,
      transferValue,
      transferExt,
    } = transferConfig;
    const fromChainInfo = await this.getChainsService().getChainInfoAsync(
      fromChainID
    );
    const toChainInfo = await this.getChainsService().getChainInfoAsync(
      toChainID
    );
    if (!fromChainInfo || !toChainInfo)
      throw new Error("Cant get ChainInfo by fromChainId or to toChainId.");
    const selectMakerConfig = await this.getCrossRulesService().getRuleByPairId(
      {
        fromChainInfo,
        toChainInfo,
        fromCurrency,
        toCurrency,
      }
    );
    if (selectMakerConfig && !Object.keys(selectMakerConfig).length)
      throw new Error("has no rule match, pls check your params!");
    if (
      transferValue > selectMakerConfig.fromChain.maxPrice ||
      transferValue < selectMakerConfig.fromChain.minPrice
    )
      throw new Error(
        "Not in the correct price range, please check your value"
      );
    try {
      return await this.crossControl.getCrossFunction(this.signer, {
        ...transferConfig,
        fromChainInfo,
        toChainInfo,
        selectMakerConfig,
        transferExt,
      });
    } catch (error) {
      throwNewError("Bridge getCrossFunction error", error);
    }
  }
}
