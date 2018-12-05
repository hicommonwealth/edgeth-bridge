pragma solidity ^0.4.22;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract EdgewareERC20 is ERC20Mintable {
    address public controller;

    constructor() {
        controller = msg.sender;
    }

    /**
    * @dev Burns a specific amount of tokens.
    * @param value The amount of token to be burned.
    */
    function burn(address account, uint256 value) public onlyAsController {
        _burn(account, value);
    }

    modifier onlyAsController() { 
        require (msg.sender == controller); 
        _; 
    }    
}
