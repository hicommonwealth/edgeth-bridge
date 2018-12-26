const Bridge = artifacts.require("./Bridge.sol");
const EdgewareERC20 = artifacts.require("./EdgewareERC20.sol");
const MockERC20Token = artifacts.require("./MockERC20Token.sol");
const ValidatorSet = artifacts.require("./ValidatorSet.sol");

module.exports = function(deployer) {
  deployer.deploy(Bridge, [], []);
};
