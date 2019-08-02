// const BigNumber = web3.BigNumber;

const Fiat = artifacts.require('Fiat');

require('chai')
    // .use(require('chai-bignumber')(BigNumber))
    .should();

contract('Fiat', accounts => {
    const _name = 'US Dollar';
    const _symbol = 'USDX';
    const _decimals = 18;

    beforeEach(async function () {
        this.token = await Fiat.new(_name, _symbol, _decimals);
    });

    describe('token attributes', function() {
        it('has the correct name', async function() {
            const name = await this.token.name();
            name.should.equal(_name);
        });

        it('has the correct symbol', async function() {
            const symbol = await this.token.symbol();
            symbol.should.equal(_symbol);
        });

        it('has the correct decimals', async function() {
            const decimals = await this.token.decimals();
            decimals.toString().should.equal(_decimals.toString());
        });
    });
});