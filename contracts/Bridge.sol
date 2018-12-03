pragma solidity ^0.4.22;

import "./EdgewareERC20.sol";
import "./ValidatorSet.sol";

contract Bridge is ValidatorSet {

    address public edgewareToken;

    /* Events  */

    event Lock(bytes to, address token, uint64 value);
    event Unlock(address to, address token, uint64 value);

    /* Functions */

    // Locks received funds to the consensus of the peg zone
    /*
     * @param to          bytes representation of destination address
     * @param value       value of transference
     * @param token       token address in origin chain (0x0 if Ethereum, Edgeware for other values)
     */
    function lock(bytes to, bool edgeware, uint64 amount) public payable returns (bool) {
        if (!edgeware) {
          require(msg.value == amount);
        } else {
          EdgewareERC20(edgewareToken).burn(msg.sender, amount);
        }

        Lock(to, tokenAddr, amount);
        return true;
    }

    // Unlocks Ethereum tokens according to the information from the pegzone. Called by the relayers.
    /*
     * @param to          bytes representation of destination address
     * @param amount      value of transference
     * @param token       token address in origin chain (0x0 if Ethereum, Edgeware otherwise)
     * @param signers     indexes of each validator
     * @param v           array of recoverys id
     * @param r           array of outputs of ECDSA signature
     * @param s           array of outputs of ECDSA signature
     */
    function unlock(address to, bool edgeware, uint64 amount, uint[] signers, uint8[] v, bytes32[] r, bytes32[] s) external returns (bool) {
        bytes32 hashData = keccak256(to, token, amount);
        require(ValidatorSet.verifyValidators(hashData, signers, v, r, s));
        
        if (!edgeware) {
          to.transfer(amount);
        } else
          EdgewareERC20(edgewareToken).mint(to, amount);
        }
        
        Unlock(to, token, amount);
        return true;
    }

    constructor(address[] initAddress, uint64[] initPowers)
      public
      ValidatorSet(initAddress, initPowers) {}
}