pragma solidity ^0.5.2;

import "./Stock.sol";
import "./Fiat.sol";

contract StockICO {
    using SafeMath for uint256;

    address public owner;
    Stock public stockToken;
    Fiat public fiatToken;
    uint8 public pricePerShare;

    event TokensPurchased(
        address indexed purchaser,
        address indexed beneficiary,
        Fiat fiatToken,
        uint256 fiatAmount,
        Stock stockToken,
        uint256 stockAmount
    );

    constructor(Stock _stockToken, Fiat _fiatToken, uint8 _pricePerShare) public {
        owner = msg.sender;
        stockToken = _stockToken;
        fiatToken = _fiatToken;
        pricePerShare = _pricePerShare;
    }

    // Will receive any eth sent to the contract.
    function () external payable {
    }

    /**
     * @dev Called by user to exchange Fiat token against Stock token.
     * @param _fiatAmount the number of Fiat tokens to be exchanged for Stock tokens.
     */
    function buyStock(uint _fiatAmount) public {
        require(fiatToken.balanceOf(msg.sender) > 0, "Sender balance can't be 0");
        require(_fiatAmount > 0, "Amount can't be 0");

        address _buyer = msg.sender;
        address _recipient = address(this);

        // 1 USDX = 10^18 wei
        uint _fiatAmountInWei = _fiatAmount.mul(1000000000000000000);
        uint _stockAmount = _getStockAmount(_fiatAmount);

        fiatToken.approveFrom(msg.sender, address(this), _fiatAmountInWei);
        fiatToken.transferFrom(msg.sender, address(this), _fiatAmountInWei);
        stockToken.transfer(msg.sender, _stockAmount);

        emit TokensPurchased(_buyer, _recipient, fiatToken, _fiatAmountInWei, stockToken, _stockAmount);
    }

    function _getStockAmount(uint256 _fiatAmount) internal view returns (uint256) {
        return _fiatAmount.div(pricePerShare);
    }

    function getTotalSupply() internal view returns (uint256) {
        return IERC20(stockToken).totalSupply();
    }
}