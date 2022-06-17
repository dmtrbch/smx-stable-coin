// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {ERC20} from "./ERC20.sol";
import {DepositorCoin} from "./DepositorCoin.sol";
import {Oracle} from "./Oracle.sol";

contract StableCoin is ERC20 {
  DepositorCoin public depositorCoin;

  Oracle public oracle;

  uint256 public feeRatePercentage;

  uint256 public constant INITIAL_COLLATERAL_RATIO_PERCENTAGE = 10;

  constructor(uint256 _feeRatePercentage, Oracle _oracle) ERC20("StableCoin", "STC") {
    feeRatePercentage = _feeRatePercentage;
    oracle = _oracle;
  }

  function mint() external payable {
    uint256 fee = _getFee(msg.value);
    uint256 remainingEth = msg.value - fee;
    uint256 mintStableCoinAmount = remainingEth * oracle.getPrice();
    _mint(msg.sender, mintStableCoinAmount);
  }

  function burn(uint256 burnStableCoinAmount) external {
    _burn(msg.sender, burnStableCoinAmount);

    uint256 refundingEth = burnStableCoinAmount / oracle.getPrice();

    uint256 fee = _getFee(refundingEth);
    uint256 remainingRefundingEth = refundingEth - fee;

    (bool success, ) = msg.sender.call{value: remainingRefundingEth}("");
    require(success, "STC: Burn refund transaction failed");
  }

  function depositCollateralBuffer() external payable {
    int256 deficitOrSurplusInUsd = _getDeficitOrSurplusInContractInUsd();

    if(deficitOrSurplusInUsd <= 0) {
      uint256 deficitInUsd = uint256(deficitOrSurplusInUsd * -1);
      uint256 deficitInEth = deficitInUsd / oracle.getPrice();

      uint256 requiredInitialSurplusInUsd = (INITIAL_COLLATERAL_RATIO_PERCENTAGE * totalSupply) / 100;

      uint256 requiredInitialSurplusInEth = requiredInitialSurplusInUsd / oracle.getPrice();

      require(msg.value >= deficitInEth + requiredInitialSurplusInEth, "STC: Initial collateral ratio not met");

      uint256 newInitialSurplusInEth = msg.value - deficitInEth;
      uint256 newInitialSurplusInUsd = newInitialSurplusInEth * oracle.getPrice();

      depositorCoin = new DepositorCoin();
      uint256 mintDepositorCoinAmountInitial = newInitialSurplusInUsd;
      depositorCoin.mint(msg.sender, mintDepositorCoinAmountInitial);
      return;
    }

    uint256 surplusInUsd = uint256(deficitOrSurplusInUsd);
    uint256 dpcInUsdPrice = _getDPCInUsdPrice(surplusInUsd);

    uint256 mintDepositorCoinAmount = (msg.value * oracle.getPrice()) / dpcInUsdPrice;

    depositorCoin.mint(msg.sender, mintDepositorCoinAmount);
  }

  function _getFee(uint256 ethAmount) private view returns (uint256) {
    bool hasDepositors = address(depositorCoin) != address(0) && depositorCoin.totalSupply() > 0;

    if(!hasDepositors) {
      return 0;
    }

    return (feeRatePercentage * ethAmount) / 100;
  }

  function _getDeficitOrSurplusInContractInUsd() private view returns (int256) {
    uint256 ethContractBalanceInUsd = (address(this).balance - msg.value) * oracle.getPrice();

    uint256 totalStableCoinBalanceInUsd = totalSupply;

    int256 deficitOrSurplus = int256(ethContractBalanceInUsd) - int256(totalStableCoinBalanceInUsd);

    return deficitOrSurplus;
  }

  function _getDPCInUsdPrice(uint256 surplusInUsd) private view returns (uint256) {
    return surplusInUsd / depositorCoin.totalSupply();
  }
}