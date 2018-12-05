'use strict';

/* Add the dependencies you're testing */
const utils = require('./utils.js');
const web3 = global.web3;
const EdgewareERC20 = artifacts.require("./../contracts/EdgewareERC20.sol");
const Bridge = artifacts.require("./../contracts/Bridge.sol");
const MockERC20Token = artifacts.require("./../contracts/MockERC20Token.sol");
const createKeccakHash = require('keccak');
const ethUtils = require('ethereumjs-util');

contract('Bridge', function(accounts) {
  const args = {
    _default: accounts[0],
    _account_one: accounts[1],
    _account_two: accounts[2],
    _address0: "0x0000000000000000000000000000000000000000"
  };

  let validators, standardTokenMock;
  let _account_one = args._account_one;
  let _account_two = args._account_two;
  let _address0 = args._address0;


  before('Setup Validators', async function() {
    validators = utils.createValidators(20);
  });

  describe('Bridge(address[],uint64[]', function () {
    let res, bridge;

    before ('Sets up Bridge contract', async function () {
      bridge = await Bridge.new(validators.addresses, validators.powers, {from: args._default});
    });

    it ('Correctly verifies ValSet signatures', async function () {
      let hashData = String(await bridge.hashValidatorArrays.call(validators.addresses, validators.powers));
      let signatures = await utils.createSigns(validators, hashData);

      res = await bridge.verifyValidators.call(hashData, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray);
      assert.isTrue(res, "Should have successfully verified signatures");
    });
  });

  describe('newEdgewareERC20(string,uint,uint[],uint8[],bytes32[],bytes32[]', function () {
    let res, bridge, edgewareTokenAddress, edgewareToken;

    before ('Creates new Edgeware ERC20 token', async function () {
      bridge = await Bridge.new(validators.addresses, validators.powers, {from: args._default});

      let hashData = String(await bridge.hashNewEdgewareERC20.call('EdgewareToken', 18));
      let signatures = await utils.createSigns(validators, hashData);

      edgewareTokenAddress = await bridge.newEdgewareERC20.call('EdgewareToken', 18, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray);
      res = await bridge.newEdgewareERC20('EdgewareToken', 18, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray);
      edgewareToken = await EdgewareERC20.at(edgewareTokenAddress);
    });

    it('Adds new token to edgewareToken mapping', async function () {
      assert.equal(await bridge.getEdgewareTokenAddress('EdgewareToken'), edgewareTokenAddress);
    });

    it('Adds address to edgewareTokensAddresses set', async function () {
      assert.isTrue(await bridge.isEdgewareTokenAddress(edgewareTokenAddress));
    });

    it('Emits NewEdgewareERC20 event', async function () {
      assert.strictEqual(res.logs.length, 1);
      assert.strictEqual(res.logs[0].event, "NewEdgewareERC20", "Successful execution should have logged the NewEdgewareERC20 event");
      assert.strictEqual(res.logs[0].args.name, 'EdgewareToken');
      assert.strictEqual(res.logs[0].args.tokenAddress, edgewareTokenAddress);
    });

    it('Is controller of new EdgewareERC20', async function () {
      assert.equal(await edgewareToken.controller.call(), bridge.address);
    });

    it('Fails if same name is resubmitted', async function () {
      let hashData = String(await bridge.hashNewEdgewareERC20.call('EdgewareToken', 10));
      let signatures = await utils.createSigns(validators, hashData);

      await utils.expectRevert(bridge.newEdgewareERC20('EdgewareToken', 10, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray));
    });
  });


  describe('lock(bytes,address,uint64)', function () {
    let res, bridge, edgewareTokenAddress, standardTokenMock;

    beforeEach('Sets up Bridge contract', async function () {
      bridge = await Bridge.new(validators.addresses, validators.powers, {from: args._default});
    });

    it('Recieves Normal ERC20 and emits Lock event', async function () {
      let standardTokenMock = await MockERC20Token.new(_account_one, 10000, {from: args._default});
      await standardTokenMock.approve(bridge.address, 1000, {from: args._account_one});
      let res = await bridge.lock("0xdeadbeef", standardTokenMock.address, 1000, {from: args._account_one});

      assert.equal((await standardTokenMock.balanceOf(bridge.address)).toNumber(), 1000);
      assert.strictEqual(res.logs.length, 1);
      assert.strictEqual(res.logs[0].event, "Lock");
      assert.strictEqual(String(res.logs[0].args.to), '0xdeadbeef');
      assert.strictEqual(res.logs[0].args.token, standardTokenMock.address);
      assert.strictEqual(res.logs[0].args.value.toNumber(), 1000);
    });


    it('Burns EdgewareERC20 and emits Lock event', async function () {
      let hashData = String(await bridge.hashNewEdgewareERC20.call('EdgewareToken', 18));
      let signatures = await utils.createSigns(validators, hashData);
      let edgewareTokenAddress = await bridge.newEdgewareERC20.call('EdgewareToken', 18, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray);
      await bridge.newEdgewareERC20('EdgewareToken', 18, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray);
      let edgewareToken = EdgewareERC20.at(edgewareTokenAddress);
      hashData = await bridge.hashUnlock(_account_one, edgewareTokenAddress, 1000);
      signatures = await utils.createSigns(validators, hashData);
      await bridge.unlock(_account_one, edgewareTokenAddress, 1000, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray);

      let res = await bridge.lock("0xdeadbeef", edgewareTokenAddress, 500, {from: args._account_one});

      assert.equal((await edgewareToken.balanceOf(_account_one)).toNumber(), 500);
      assert.strictEqual(res.logs.length, 1);
      assert.strictEqual(res.logs[0].event, "Lock");
      assert.strictEqual(String(res.logs[0].args.to), '0xdeadbeef');
      assert.strictEqual(res.logs[0].args.token, edgewareTokenAddress);
      assert.strictEqual(res.logs[0].args.value.toNumber(), 500);
    });

    it('Sends Ether when token is 0 address and emits Lock event', async function () {

      let res = await bridge.lock("0xdeadbeef", _address0, 1000, {from: args._account_one, value: 1000});

      let ethBalance = await web3.eth.getBalance(bridge.address);

      assert.equal(ethBalance.toNumber(), 1000);
      assert.strictEqual(res.logs.length, 1);
      assert.strictEqual(res.logs[0].event, "Lock");
      assert.strictEqual(String(res.logs[0].args.to), '0xdeadbeef');
      assert.strictEqual(res.logs[0].args.token, _address0);
      assert.strictEqual(res.logs[0].args.value.toNumber(), 1000);
    });
  });


  describe('unlock(address,address,uint64,uint[],uint8[],bytes32[],bytes32[])', function () {
    let bridge, res;

    beforeEach('Sets up Bridge contract', async function () {
      bridge = await Bridge.new(validators.addresses, validators.powers, {from: args._default});
    });

    it('Sends Normal ERC20 and emits Unlock event', async function () {
      let standardTokenMock = await MockERC20Token.new(bridge.address, 10000, {from: args._default});
      let hashData = await bridge.hashUnlock(_account_one, standardTokenMock.address, 1000);
      let signatures = await utils.createSigns(validators, hashData);

      res = await bridge.unlock(args._account_one, standardTokenMock.address, 1000, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray);
      assert.equal((await standardTokenMock.balanceOf(_account_one)).toNumber(), 1000);

      assert.strictEqual(res.logs.length, 1);
      assert.strictEqual(res.logs[0].event, "Unlock");
      assert.strictEqual(String(res.logs[0].args.to), args._account_one);
      assert.strictEqual(res.logs[0].args.token, standardTokenMock.address);
      assert.strictEqual(res.logs[0].args.value.toNumber(), 1000);
    });

    it('Mints edgeware ERC20 and emits Unlock event', async function () {

      let hashData = String(await bridge.hashNewEdgewareERC20.call('EdgewareToken', 18));
      let signatures = await utils.createSigns(validators, hashData);
      let edgewareTokenAddress = await bridge.newEdgewareERC20.call('EdgewareToken', 18, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray);
      await bridge.newEdgewareERC20('EdgewareToken', 18, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray);
      let edgewareToken = EdgewareERC20.at(edgewareTokenAddress);

      hashData = await bridge.hashUnlock(_account_one, edgewareTokenAddress, 1000);
      signatures = await utils.createSigns(validators, hashData);

      res = await bridge.unlock(_account_one, edgewareTokenAddress, 1000, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray);
      assert.equal((await edgewareToken.balanceOf(_account_one)).toNumber(), 1000);

      assert.strictEqual(res.logs.length, 1);
      assert.strictEqual(res.logs[0].event, "Unlock");
      assert.strictEqual(String(res.logs[0].args.to), args._account_one);
      assert.strictEqual(res.logs[0].args.token, edgewareTokenAddress);
      assert.strictEqual(res.logs[0].args.value.toNumber(), 1000);
    });

    it('Sends Ether when token is address 0x0 and emits Unlock event', async function () {
      // fund the Bridge contract with a little bit of ether
      await bridge.lock("0xdeadbeef", _address0, 5000, {from: args._account_two, value: 5000});

      let oldBalance = await web3.eth.getBalance(_account_one);

      let hashData = await bridge.hashUnlock(_account_one, _address0, 1000);
      let signatures = await utils.createSigns(validators, hashData);
      res = await bridge.unlock(args._account_one, args._address0, 1000, signatures.signers, signatures.vArray, signatures.rArray, signatures.sArray);
      assert.equal(await web3.eth.getBalance(_account_one).toNumber(), oldBalance.toNumber() + 1000);

      assert.strictEqual(res.logs.length, 1);
      assert.strictEqual(res.logs[0].event, "Unlock");
      assert.strictEqual(String(res.logs[0].args.to), args._account_one);
      assert.strictEqual(res.logs[0].args.token, args._address0);
      assert.strictEqual(res.logs[0].args.value.toNumber(), 1000);
    });
  });
});