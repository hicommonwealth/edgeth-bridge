pragma solidity ^0.4.22;

import "./EdgewareERC20.sol";
import "./ValidatorSet.sol";

contract Bridge is ValidatorSet {

    address public edgewareToken;

    /* Events  */

    event Lock(bytes to,  uint64 value);
    event Unlock(address to, uint64 value);

    constructor(address[] initAddress, uint64[] initPowers)
      public
      ValidatorSet(initAddress, initPowers) {}

    /*
     * Locks EdgewareERC20 tokens by burning them
     *
     * @param to          bytes representation of destination address
     * @param value       value of transference
     */
    function lock(bytes to, uint64 amount) public returns (bool) {
        EdgewareERC20(edgewareToken).burn(msg.sender, amount);
        Lock(to, amount);
        return true;
    }

    /*
     * Unlocks EdgewareERC20 tokens using secp256k1 signed messages
     * from the bridge authorities/relayers
     *
     * @param to          bytes representation of destination address
     * @param amount      value of transference
     * @param signers     indexes of each validator
     * @param v           array of recoverys id
     * @param r           array of outputs of ECDSA signature
     * @param s           array of outputs of ECDSA signature
     */
    function unlock(address to, uint64 amount, uint[] signers, uint8[] v, bytes32[] r, bytes32[] s) public returns (bool) {
        bytes32 hashData = keccak256(to, amount);
        require(ValidatorSet.verifyValidators(hashData, signers, v, r, s));
        EdgewareERC20(edgewareToken).mint(to, amount);
        Unlock(to, token, amount);
        return true;
    }
}
