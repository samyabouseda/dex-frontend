pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract Stock is ERC20, Ownable, ERC20Detailed {
    // As we wish to mirror existing shares in the stock market
    // and base their price on USD, we need to use 2 decimals.
    uint8 DECIMALS = 2;

    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20Detailed(name, symbol, DECIMALS) public {
        _mint(msg.sender, initialSupply);
    }
}
