pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";

contract FiatCrowdsale is Crowdsale, MintedCrowdsale {

    constructor(
        uint8 _rate,
        address payable _wallet,
        ERC20 _token
    )
    Crowdsale(_rate, _wallet, _token)
    public {

    }

    /**
     * @dev Source of tokens. Override this method to modify the way in which the crowdsale ultimately gets and sends
     * its tokens.
     * @param beneficiary Address performing the token purchase
     * @param tokenAmount Number of tokens to be emitted
     */
//    function _deliverTokens(address beneficiary, uint256 tokenAmount) internal {
//        IERC20(address(token())).safeTransferFrom(address(wallet()), beneficiary, tokenAmount);
//    }
}