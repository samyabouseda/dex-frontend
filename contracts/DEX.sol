pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./Approvable.sol";

contract DEX {
    using SafeMath for uint256;

    address private _owner;
    address private _matchingEngine;
    mapping (address => mapping (address => uint256)) private _tokens;
    mapping (address => bool) _listedTokens;

    struct Trade {
        address tokenMaker;
        address tokenTaker;
        uint256 amountMaker;
        uint256 amountTaker;
        address addressMaker;
        address addressTaker;
        uint256 nonce;
    }

    event OrderFilled(
        address tokenMaker,
        address tokenTaker,
        uint256 amountMaker,
        uint256 amountTaker,
        address addressMaker,
        address addressTaker,
        uint256 nonce
    );

    constructor (address matchingEngine) public {
        _matchingEngine = matchingEngine;
        _owner == msg.sender; // Or we can hard code the matching engine address directly.
    }

    function matchingEngine() public view returns (address) {
        return _matchingEngine;
    }

    function balanceOf(address account, address token) public view returns (uint256) {
        require(_listedTokens[token] == true, "Balance: token is not listed yet");
        return _tokens[token][account];
    }

    function deposit(address token, uint256 amount) public {
        Approvable(token).approveFrom(msg.sender, address(this), amount);
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        _listedTokens[token] = true;
        _tokens[token][msg.sender] = _tokens[token][msg.sender].add(amount);
    }

    function withdraw(address token, uint256 amount) public {

    }

    function trade(
        address tokenMaker,
        address tokenTaker,
        uint256 amountMaker,
        uint256 amountTaker,
        address addressMaker,
        address addressTaker,
        uint256 nonce,
        bytes memory signature
    ) public {
        Trade memory trade = Trade(tokenMaker, tokenTaker, amountMaker, amountTaker, addressMaker, addressTaker, nonce);
        require(msg.sender == _matchingEngine, "Sender: should be matching engine");
        require(isValidSignature(trade, signature), "Trade: signature is invalid.");

        // Token exchange
        IERC20 _tokenMaker = IERC20(tokenMaker);
        IERC20 _tokenTaker = IERC20(tokenTaker);

        _tokenMaker.transfer(addressTaker, amountMaker);
        _tokens[tokenMaker][addressMaker] = _tokens[tokenMaker][addressMaker].sub(amountMaker);
        _tokens[tokenMaker][addressTaker] = _tokens[tokenMaker][addressTaker].add(amountMaker);

        _tokenTaker.transfer(addressMaker, amountTaker);
//        _tokens[tokenTaker][addressTaker] = _tokens[tokenTaker][addressTaker].sub(amountMaker);
//        _tokens[tokenTaker][addressMaker] = _tokens[tokenTaker][addressMaker].add(amountMaker);
//
        emit OrderFilled(
            trade.tokenMaker,
            trade.tokenTaker,
            trade.amountMaker,
            trade.amountTaker,
            trade.addressMaker,
            trade.addressTaker,
            trade.nonce
        );
    }

    function isValidSignature(Trade memory trade, bytes memory signature)
        internal
        view
        returns (bool)
    {
        bytes32 tradeHash = prefixed(keccak256(abi.encodePacked(
            trade.tokenMaker,
            trade.tokenTaker,
            trade.amountMaker,
            trade.amountTaker,
            trade.addressMaker,
            trade.addressTaker,
            trade.nonce
        )));

        // check that the signature is from the matching engine
        return recoverSigner(tradeHash, signature) == _matchingEngine;
    }

    // builds a prefixed hash to mimic the behavior of eth_sign.
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function recoverSigner(bytes32 message, bytes memory sig)
        internal
        pure
        returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);

        return ecrecover(message, v, r, s);
    }

    function splitSignature(bytes memory sig)
        internal
        pure
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        require(sig.length == 65);

        assembly {
        // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
        // second 32 bytes
            s := mload(add(sig, 64))
        // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

}