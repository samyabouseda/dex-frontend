const ether = n => web3.utils.toBN(web3.utils.toWei(n.toString(), 'ether'));
// const USDXtoWei = n =>

// const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    // .use(require('chai-bignumber')(BigNumber))
    .should();

const Fiat = artifacts.require('Fiat');
const FiatCrowdsale = artifacts.require('FiatCrowdsale');

// $1.70 trillion in circulation as of January 31, 2019
// more info at: https://www.federalreserve.gov/faqs/currency_12773.htm
const USDX_INITIAL_SUPPLY = 1700000000000;

contract('FiatCrowdsale', async accounts => {

    beforeEach(async function () {
        this.federalReserveWallet = await accounts[1];
        this.investor1 = await accounts[2];
        this.investor2 = await accounts[3];

        // Token config
        this.name = "US Dollar";
        this.symbol = "USDX";
        this.decimals = 2;

        // Deploy Token
        this.token = await Fiat.new(
            this.name,
            this.symbol,
            this.decimals,
        );

        // Crowdsale config
        this.rate = 200;

        this.crowdsale = await FiatCrowdsale.new(
            this.rate,
            this.federalReserveWallet,
            this.token.address,
        );

        // Add Federal Reserve and Crowdsale contract as minter.
        await this.token.addMinter(this.federalReserveWallet);
        await this.token.addMinter(this.crowdsale.address);

        // Use this if ER20 token is Ownable.
        await this.token.transferOwnership(this.crowdsale.address);

        // Federal Reserve mints initial supply.
        await this.token.mint(this.federalReserveWallet, USDX_INITIAL_SUPPLY, { from: this.federalReserveWallet });
    });

    describe('crowdsale', function () {
        it('tracks the rate', async function () {
            const rate = await this.crowdsale.rate();
            rate.toString().should.equal(this.rate.toString());
        });

        it('tracks the wallet', async function () {
            const _wallet = await this.crowdsale.wallet();
            _wallet.should.equal(this.federalReserveWallet);
        });

        it('tracks the token', async function () {
            const token = await this.crowdsale.token();
            token.should.equal(this.token.address);
        });
    });

    describe('minted crowdsale', function () {
        it('Federal Reserve wallet has minter role', async function () {
            const isMinter = await this.token.isMinter(this.federalReserveWallet);
            isMinter.should.equal(true);
        });

        it('Federal Reserve can mint USDX tokens', async function () {
            const initialSupply = await this.token.totalSupply();
            // We should use the buyTokens() function but it doesn't work...
            // await this.crowdsale.buyTokens(this.crowdsale.address, { value: ether(1), from: this.federalReserveWallet });
            await this.token.mint(this.federalReserveWallet, 200);
            const totalSupply = await this.token.totalSupply();
            assert.isTrue(totalSupply > initialSupply);
            totalSupply.toString().should.equal((USDX_INITIAL_SUPPLY + 200).toString());
        });

        it('Federal Reserve can add minter', async function () {
            await this.token.addMinter(this.investor1);
            await this.token.mint(this.federalReserveWallet, 200, { from: this.investor1 }).should.be.fulfilled;
            const totalSupply = await this.token.totalSupply();
            totalSupply.toString().should.equal((USDX_INITIAL_SUPPLY + 200).toString());
        });

        it('user can\'t mint if doesn\'t have minter role', async function () {
            await this.token.mint(this.federalReserveWallet, 200, { from: this.investor1 }).should.not.be.fulfilled;
            await this.token.mint(this.investor1, 200, { from: this.investor1 }).should.not.be.fulfilled;
        });

        it('user can buy USDX tokens', async function () {
            let purchaser = this.investor1;
            let balanceOf = await this.token.balanceOf(purchaser);
            balanceOf.toString().should.equal('0');
            await this.crowdsale.sendTransaction({ from: purchaser, value: ether(0.000005)});
            balanceOf = await this.token.balanceOf(purchaser);
            let balanceInUSDX = web3.utils.fromWei(balanceOf.toString());
            balanceInUSDX.toString().should.equal('0.001');
        });
    });

    describe('USDX', function () {
        it('has initial supply of ' + USDX_INITIAL_SUPPLY, async function () {
            // const initialSupply = await this.token.totalSupply();
            const totalSupply = await this.token.totalSupply();
            // assert.isTrue(totalSupply > initialSupply);
            totalSupply.toString().should.equal(USDX_INITIAL_SUPPLY.toString());
        });

        it('total supply is owned by Federal Reserve', async function () {
            await this.token.mint(this.federalReserveWallet, USDX_INITIAL_SUPPLY, { from: this.federalReserveWallet });
            const totalSupply = await this.token.totalSupply();
            const balanceOfFederalReserve = await this.token.balanceOf(this.federalReserveWallet);
            balanceOfFederalReserve.toString().should.equal(totalSupply.toString());
        });

        it('users can transfer USDX', async function () {
            // Investor1 purchase 1 USDX.
            await this.crowdsale.sendTransaction({ from: this.investor1, value: web3.utils.toWei('0.005')});
            let balanceOfInvestor1 = await this.token.balanceOf(this.investor1);
            web3.utils.fromWei(balanceOfInvestor1).toString().should.equal('1');

            // Investor2 doesn't own USDX.
            let balanceOfInvestor2 = await this.token.balanceOf(this.investor2);
            balanceOfInvestor2.toString().should.equal('0');

            // Investor1 transfer 1 USDX to Investor2.
            await this.token.transfer(this.investor2, web3.utils.toWei('1'), { from: this.investor1 });
            balanceOfInvestor1 = await this.token.balanceOf(this.investor1);
            balanceOfInvestor2 = await this.token.balanceOf(this.investor2);
            web3.utils.fromWei(balanceOfInvestor1).toString().should.equal('0');
            web3.utils.fromWei(balanceOfInvestor2).toString().should.equal('1');
        });


    });

});