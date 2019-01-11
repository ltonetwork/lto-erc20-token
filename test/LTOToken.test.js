const LTOToken = artifacts.require('./LTOToken.sol');
const config = require('../config.json');
const tokenConfig = config.token;
const constants = require('./helpers/constants');

contract('LTOToken', ([owner, bridge, otherAccount]) => {

  describe('when creating a token', () => {
    it('should throw an error if no bridge address is given', async () => {
      try {
        const token = await LTOToken.new(50, constants.ZERO_ADDRESS, 50);
      } catch (ex) {
        assert.equal(ex.receipt.status, '0x0', 'Will failure');
      }
    });
  });

  context('created token', () => {
    before(async () => {
      this.token = await LTOToken.new(50, bridge, 50);
    });

    describe('info', () => {
      describe('when creating a new token', () => {
        it('should have correct token info', async () => {
          const name = await this.token.name();
          assert.equal(name, tokenConfig.name);

          const symbol = await this.token.symbol();
          assert.equal(symbol, tokenConfig.symbol);

          const decimals = await this.token.decimals();
          assert(decimals.equals(tokenConfig.decimals));

          const totalSupply = await this.token.totalSupply();
          assert(totalSupply.equals(50));

          const bridgeSupply = await this.token.bridgeBalance();
          assert(bridgeSupply.equals(50));
        });
      });
    });

    describe('bridge', () => {

      describe('when adding an intermediate addresses from a non bridge address', () => {
        it('should throw an error', async () => {
          try {
            await this.token.addIntermediateAddress(otherAccount);
          } catch (e) {
            assert.equal(e.receipt.status, '0x0', 'Will failure');
          }
        })
      });

      describe('when adding an intermediate address from the bridge', () => {

        it('should be added', async () => {
          const tx = await this.token.addIntermediateAddress(otherAccount, {from: bridge});
          assert.equal(tx.receipt.status, '0x1', 'failure');
        });

        describe('when transfering to an intermediate address', async () => {

          it('should forward the funds to the bridge address', async () => {

            const tx = await this.token.transfer(otherAccount, 5);

            assert.strictEqual(tx.receipt.status, '0x1', 'failure');
            assert.strictEqual(tx.logs[0].event, 'Transfer');
            assert.strictEqual(tx.logs[0].args.from, owner);
            assert.strictEqual(tx.logs[0].args.to, otherAccount);

            const otherBalance = await this.token.balanceOf(otherAccount);
            assert.equal(otherBalance.toNumber(), 0);

            const bridgeBalance = await this.token.bridgeBalance();
            assert.equal(bridgeBalance.toNumber(), 55);

            const totalSupply = await this.token.totalSupply();
            assert.equal(totalSupply.toNumber(), 45);
          });
        });
      });
    });
  });
});