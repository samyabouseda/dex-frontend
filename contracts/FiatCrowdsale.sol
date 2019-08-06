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
        public
    {

    }
}