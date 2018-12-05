pragma solidity ^0.4.22;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";

contract EdgewareERC20 is ERC20Mintable, ERC20Burnable {
    address public controller;

    constructor() {
        controller = msg.sender;
    }

    function burn(uint256 value) public onlyByController {
        super.burn(value);
    }

    function burnFrom(address sender, uint256 value) public onlyByController {
        super.burnFrom(sender, value);
    }

    modifier onlyByController() {
        require(msg.sender == controller);
        _;
    }
    
}
