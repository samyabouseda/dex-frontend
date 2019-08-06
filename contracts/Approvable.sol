pragma solidity ^0.5.0;

/**
 * @dev Interface of the Approvable tokens to be approved from SC.
 */
interface Approvable {
    /**
     * Sets `amount` as the allowance of `spender` over the `sender`'s tokens.
     */
    function approveFrom(address sender, address spender, uint256 amount) external returns (bool);
}
