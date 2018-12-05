pragma solidity ^0.4.22;

import "./EdgewareERC20.sol";
import "./ValidatorSet.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract Bridge is ValidatorSet {

    mapping (string => address) edgewareTokens;
    mapping (address => bool) edgewareTokenAddresses;

    /* Events  */
    event NewEdgewareERC20(string name, address tokenAddress);
    event Lock(bytes to, address token, uint64 value);
    event Unlock(address to, address token, uint64 value);

    constructor(address[] initAddress, uint64[] initPowers)
        public
        ValidatorSet(initAddress, initPowers)
        {}

    /* Functions */

    function hashNewEdgewareERC20(string name, uint decimals) public pure returns (bytes32 hash) {
      return keccak256(abi.encodePacked(name, decimals));
    }

    function hashUnlock(address to, address token, uint64 amount) public pure returns (bytes32 hash) {
      return keccak256(abi.encodePacked(to, token, amount));
    }

    function getEdgewareTokenAddress(string name) public constant returns (address addr) {
      return edgewareTokens[name];
    }


    function isEdgewareTokenAddress(address addr) public constant returns (bool isCosmosAddr) {
      return edgewareTokenAddresses[addr];
    }

    // Locks received funds to the consensus of the peg zone
    /*
     * @param to          bytes representation of destination address
     * @param value       value of transference
     * @param token       token address in origin chain (0x0 if Ethereum, Cosmos for other values)
     */
    function lock(bytes to, address tokenAddr, uint64 amount) public payable returns (bool) {
        if (msg.value != 0) {
          require(tokenAddr == address(0));
          require(msg.value == amount);
        } else if (edgewareTokenAddresses[tokenAddr]) {
          EdgewareERC20(tokenAddr).burnFrom(msg.sender, amount);
        } else {
          require(ERC20(tokenAddr).transferFrom(msg.sender, this, amount));
        }
        emit Lock(to, tokenAddr, amount);
        return true;
    }

    // Unlocks Ethereum tokens according to the information from the pegzone. Called by the relayers.
    /*
     * @param to          bytes representation of destination address
     * @param value       value of transference
     * @param token       token address in origin chain (0x0 if Ethereum, Cosmos for other values)
     * @param chain       bytes respresentation of the destination chain (not used in MVP, for incentivization of relayers)
     * @param signers     indexes of each validator
     * @param v           array of recoverys id
     * @param r           array of outputs of ECDSA signature
     * @param s           array of outputs of ECDSA signature
     */
    function unlock(address to, address token, uint64 amount, uint[] signers, uint8[] v, bytes32[] r, bytes32[] s) external returns (bool) {
        bytes32 hashData = keccak256(abi.encodePacked(to, token, amount));
        require(ValidatorSet.verifyValidators(hashData, signers, v, r, s));
        if (token == address(0)) {
          to.transfer(amount);
        } else if (edgewareTokenAddresses[token]) {
          EdgewareERC20(token).mint(to, amount);
        } else {
          require(ERC20(token).transfer(to, amount));
        }
        emit Unlock(to, token, amount);
        return true;
    }

    function newEdgewareERC20(string name, uint decimals, uint[] signers, uint8[] v, bytes32[] r, bytes32[] s) external returns (address addr) {
        require(edgewareTokens[name] == address(0));

        bytes32 hashData = keccak256(abi.encodePacked(name, decimals));
        require(ValidatorSet.verifyValidators(hashData, signers, v, r, s));

        EdgewareERC20 newToken = new EdgewareERC20();

        edgewareTokens[name] = newToken;
        edgewareTokenAddresses[newToken] = true;

        emit NewEdgewareERC20(name, newToken);
        return newToken;
    }
}
