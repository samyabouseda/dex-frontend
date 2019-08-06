pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Approvable.sol";

contract Fiat is ERC20Mintable, ERC20Detailed, Ownable, Approvable {
    constructor(string memory _name, string memory _symbol, uint8 _decimals)
        ERC20Detailed(_name, _symbol, _decimals)
        public {

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