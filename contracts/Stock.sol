pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./Approvable.sol";

contract Stock is ERC20, Ownable, ERC20Detailed, Approvable {
    // As we wish to mirror existing shares in the stock market
    // and base their price on USD, we need to use 2 decimals.
    uint8 DECIMALS = 2;

    constructor(string memory name, string memory symbol, uint256 initialSupply)
        ERC20Detailed(name, symbol, DECIMALS)
        public
    {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `sender`'s tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits an `Approval` event.
     */
    function approveFrom(address sender, address spender, uint256 value) public returns (bool) {
        _approve(sender, spender, value);
        return true;
    }
}
