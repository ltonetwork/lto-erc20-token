const LTOToken = artifacts.require('./LTOToken.sol');
const BalanceCopier = artifacts.require('./BalanceCopier.sol');

contract('BalanceCopier', ([owner, bridge, holder1, holder2, holder3, noHolder]) => {
    context('created old token', () => {
        before(async () => {
            this.oldToken = await LTOToken.new(bridge, 50);

            await this.oldToken.mint(holder1, 32);
            await this.oldToken.mint(holder2, 20);

            await this.oldToken.unpause();

            await this.oldToken.transfer(holder3, 22, {from: holder1});
        });

        it('should have the correct balances', async () => {
            const balance1 = await this.oldToken.balanceOf(holder1);
            assert(balance1.equals(10));

            const balance2 = await this.oldToken.balanceOf(holder2);
            assert(balance2.equals(20));

            const balance3 = await this.oldToken.balanceOf(holder3);
            assert(balance3.equals(22));
        });

        it('should have the correct total supply', async () => {
            const totalSupply = await this.oldToken.totalSupply();
            assert(totalSupply.equals(52));
        });
    });

    context('created new token', () => {
        before(async () => {
            this.newToken = await LTOToken.new(bridge, 50);
        });

        it('should have no supply', async () => {
            const totalSupply = await this.newToken.totalSupply();
            assert(totalSupply.equals(0));
        });
    });

    context('created balance copier', () => {
        before(async () => {
            this.balanceCopier = await BalanceCopier.new(this.oldToken.address, this.newToken.address);
            this.newToken.addPauser(this.balanceCopier.address);
        });

        it('should be properly configured', async () => {
            const oldTokenAddress = await this.balanceCopier.oldToken();
            assert.equal(oldTokenAddress, this.oldToken.address);

            const newTokenAddress = await this.balanceCopier.newToken();
            assert.equal(newTokenAddress, this.newToken.address);
        });

        it('should not be able to copy yet, since the old token isn\'t paused', async() => {
            try {
                await this.balanceCopier.copy(holder1)
            } catch (ex) {
                assert.equal(ex.receipt.status, '0x0', 'Will failure');
                return;
            }
            assert.fail('No error thrown');
        });
    });

    context('ready to copy', () => {
        before(async () => {
            this.oldToken.pause();
        });

        context('copy the balance of a single account', () => {
            before(async () => {
                this.balanceCopier.copy(holder1);
            });

            it('should have the correct balance for that account', async () => {
                const balance1 = await this.newToken.balanceOf(holder1);
                assert(balance1.equals(10));
            });

            it('should fail to copy the same account twice', async () => {
                try {
                    await this.balanceCopier.copy(holder1)
                } catch (ex) {
                    assert.equal(ex.receipt.status, '0x0', 'Will failure');
                    return;
                }
                assert.fail('No error thrown');
            });

            it('should fail to copy an account with zero balance', async () => {
                try {
                    await this.balanceCopier.copy(noHolder)
                } catch (ex) {
                    assert.equal(ex.receipt.status, '0x0', 'Will failure');
                    return;
                }
                assert.fail('No error thrown');
            });
        });

        context('copy the balance of all accounts', () => {
            before(async () => {
                this.balanceCopier.copyAll([holder1, holder2, holder3, noHolder]);
            });

            it('should have the correct balances', async () => {
                const balance1 = await this.newToken.balanceOf(holder1);
                assert(balance1.equals(10));

                const balance2 = await this.newToken.balanceOf(holder2);
                assert(balance2.equals(20));

                const balance3 = await this.newToken.balanceOf(holder3);
                assert(balance3.equals(22));

                const balanceZero = await this.newToken.balanceOf(noHolder);
                assert(balanceZero.equals(0));
            });
        });
    });

    context('done copying', () => {
        before(async () => {
            this.balanceCopier.done();
        });

        context('new token', () => {
            it('should be not have the balance copier as pauser', async () => {
                isPauser = await this.newToken.isPauser(this.balanceCopier.address);
                assert.equal(isPauser, false);
            });

            it('should be unpaused', async () => {
                isPaused = await this.newToken.paused();
                assert.equal(isPauser, false);
            });

            it('should be pre-minted', async () => {
                isMinted = await this.newToken.minted();
                assert.equal(isMinted, true);
            });
        });
    });
})
