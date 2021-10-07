const LTOToken = artifacts.require('./LTOToken.sol');
const TestToken = artifacts.require('./TestToken.sol');
const config = require('../config.json');
const tokenConfig = config.token;
const constants = require('./helpers/constants');

contract('LTOToken', ([owner, bridge, intermediate, holder, other]) => {
  before(async () => {
    this.oldToken = await TestToken.new();
    await this.oldToken.mint(holder, 50);
  });

  describe('when creating a token', () => {
    it('should throw an error if no bridge address is given', async () => {
      try {
        await LTOToken.new(constants.ZERO_ADDRESS, 100, this.oldToken.address);
      } catch (ex) {
        return;
      }
      assert.fail('No error thrown');
    });
  });

  context('LTO token', () => {
    before(async () => {
      this.token = await LTOToken.new(bridge, 100, this.oldToken.address);
    });

    describe('when creating a new token', () => {
      it('should have correct token info', async () => {
        const name = await this.token.name();
        assert.equal(name, tokenConfig.name);

        const symbol = await this.token.symbol();
        assert.equal(symbol, tokenConfig.symbol);

        const decimals = await this.token.decimals();
        assert.equal(decimals.toNumber(), tokenConfig.decimals);
      });

      it('should have correct token supply', async () => {
        const totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply.toNumber(), 0);

        const bridgeBalance = await this.token.bridgeBalance();
        assert.equal(bridgeBalance.toNumber(), 100);
      });
    });

    describe('swapping the old token', () => {
      before(async () => {
        await this.oldToken.approve(this.token.address, 40, {from: holder});
        await this.token.swap({from: holder});
      });

      it('should have burned the old token', async () => {
        const totalSupply = await this.oldToken.totalSupply();
        assert.equal(totalSupply.toNumber(), 10);

        const balance = await this.oldToken.balanceOf(holder);
        assert.equal(balance.toNumber(), 10);
      });

      it('should have minted the new token', async () => {
        const totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply.toNumber(), 40);

        const bridgeBalance = await this.token.bridgeBalance();
        assert.equal(bridgeBalance.toNumber(), 60);

        const balance = await this.token.balanceOf(holder);
        assert.equal(balance.toNumber(), 40);
      });
    });

    describe('transfer', () => {
      before(async () => {
        await this.token.transfer(intermediate, 2, {from: holder});
        await this.token.transfer(other, 2, {from: holder});
      });

      it('should have the correct balances', async () => {
        const balanceHolder = await this.token.balanceOf(holder);
        assert.equal(balanceHolder.toNumber(), 36);

        const balanceIntermediate = await this.token.balanceOf(intermediate);
        assert.equal(balanceIntermediate.toNumber(), 2);

        const balanceOther = await this.token.balanceOf(other);
        assert.equal(balanceOther.toNumber(), 2);
      })
    });
  });

  describe('Bridge', () => {

    describe('when adding an intermediate addresses from a non bridge address', () => {
      it('should throw an error', async () => {
        try {
          await this.token.addIntermediateAddress(other);
          assert.fail('Not errored')
        } catch (e) {
          assert.equal(e.receipt.status, '0x0', 'Will failure');
        }
      })
    });

    describe('when adding and confirming an intermediate address from the bridge', () => {
      before(async () => {
        await this.token.addIntermediateAddress(intermediate, {from: bridge});
        await this.token.confirmIntermediateAddress({from: intermediate});
      });

      it('should have the balance burned', async () => {
        const balance = await this.token.balanceOf(intermediate);
        assert.equal(balance.toNumber(), 0);

        const bridgeBalance = await this.token.bridgeBalance();
        assert.equal(bridgeBalance.toNumber(), 62);

        const totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply.toNumber(), 38);
      });
    });

    describe('when transfering to an intermediate address', async () => {
      before(async () => {
        await this.token.transfer(intermediate, 5, {from: holder});
      })

      it('should forward the funds to the bridge address', async () => {
        const balance = await this.token.balanceOf(intermediate);
        assert.equal(balance.toNumber(), 0);

        const bridgeBalance = await this.token.bridgeBalance();
        assert.equal(bridgeBalance.toNumber(), 67);

        const totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply.toNumber(), 33);
      });
    });

    describe('when adding a foreign address as intermediate address', () => {
      before(async () => {
        await this.token.addIntermediateAddress(other, {from: bridge});
      });

      it('should NOT have the balance burned', async () => {
        const balance = await this.token.balanceOf(other);
        assert.equal(balance.toNumber(), 2);
      });
    });

    describe('when transfering to an unconfirmed intermediate address', async () => {

      it('should NOT forward the funds to the bridge address', async () => {
        const bridgeBalanceOrg = await this.token.bridgeBalance();
        const totalSupplyOrg = await this.token.totalSupply();

        await this.token.transfer(other, 5, {from: holder});

        const balance = await this.token.balanceOf(other);
        assert.equal(balance.toNumber(), 7);

        const bridgeBalance = await this.token.bridgeBalance();
        assert.equal(bridgeBalance.toNumber(), bridgeBalanceOrg.toNumber());

        const totalSupply = await this.token.totalSupply();
        assert.equal(totalSupply.toNumber(), totalSupplyOrg.toNumber());
      });
    });
  });
});
