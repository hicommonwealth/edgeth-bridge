var Bridge = artifacts.require("./Bridge.sol");
var EdgewareERC20 = artifacts.require("./EdgewareERC20.sol");
var MockERC20Token = artifacts.require("./MockERC20Token.sol");
var ValidatorSet = artifacts.require("./ValidatorSet.sol");

module.exports = function(deployer) {
  deployer.deploy(Bridge);
};
