const ETH_RATE = 200;
const AAPL_INITIAL_SUPPLY = 4601075000;
const toUSDX = n => web3.utils.fromWei(n.toString());
const USDXToWei = n => {
    let nInEth = n / ETH_RATE;
    return web3.utils.toWei(nInEth.toString(), 'ether');
};

const abi = require('ethereumjs-abi');

require('chai')
    .use(require('chai-as-promised'))
    .should();

const Fiat = artifacts.require('Fiat');
const FiatCrowdsale = artifacts.require('FiatCrowdsale');
const Stock = artifacts.require('Stock');
const StockICO = artifacts.require('StockICO');
const DEX = artifacts.require('DEX');

contract('StockICO', async accounts => {

    beforeEach(async function () {
        this.federalReserveWallet = await accounts[1];
        this.investor1 = await accounts[2];
        this.investor2 = await accounts[3];
        this.appleWallet = await accounts[4];

        // Deploy Token
        this.fiat = await Fiat.new(
            "US Dollar",
            "USDX",
            2,
        );

        // Crowdsale config
        this.rate = 200;
        this.crowdsale = await FiatCrowdsale.new(
            this.rate,
            this.federalReserveWallet,
            this.fiat.address,
        );
        await this.fiat.addMinter(this.crowdsale.address);
        await this.fiat.transferOwnership(this.crowdsale.address);

        // Stock config
        this.stock = await Stock.new(
            "Apple Inc.",
            "AAPL",
            AAPL_INITIAL_SUPPLY,
            { from: this.appleWallet }
        );

        // StockICO config
        this.pricePerShare = 200;
        this.stockICO = await StockICO.new(
            this.stock.address,
            this.fiat.address,
            this.pricePerShare,
            { from: this.appleWallet }
        );
        await this.stock.transfer(this.stockICO.address, AAPL_INITIAL_SUPPLY, { from: this.appleWallet });
        await this.stock.transferOwnership(this.stockICO.address, { from: this.appleWallet });

        // DEX config
        this.matchingEngine = await accounts[9];
        this.DEX = await DEX.new('0x4625382e88790b76E5bAD2e9c8E724211cDDd011', { from: this.matchingEngine });
    });

    describe('investors', function () {
        it('can buy AAPL shares with USDX', async function () {
            // Insverstor buys USDX
            await this.crowdsale.sendTransaction({ from: this.investor1, value: USDXToWei(1000)});

            let initialInvestorFiatBalance = await this.fiat.balanceOf(this.investor1);
            let initialICOFiatBalance = await this.fiat.balanceOf(this.stockICO.address);
            let initialInvestorStockBalance = await this.stock.balanceOf(this.investor1);
            let initialICOStockBalance = await this.stock.balanceOf(this.stockICO.address);
            toUSDX(initialInvestorFiatBalance).should.equal('1000');
            toUSDX(initialICOFiatBalance).should.equal('0');
            initialInvestorStockBalance.toString().should.equal('0');
            initialICOStockBalance.toString().should.equal(AAPL_INITIAL_SUPPLY.toString());

            // Investor buys AAPL shares with USDX
            await this.stockICO.buyStock(600, { from: this.investor1 });

            let investorFiatBalance = await this.fiat.balanceOf(this.investor1);
            let ICOFiatBalance = await this.fiat.balanceOf(this.stockICO.address);
            let investorStockBalance = await this.stock.balanceOf(this.investor1);
            let ICOStockBalance = await this.stock.balanceOf(this.stockICO.address);
            toUSDX(investorFiatBalance).should.equal('400');
            toUSDX(ICOFiatBalance).should.equal('600');
            investorStockBalance.toString().should.equal('3');
            ICOStockBalance.toString().should.equal((AAPL_INITIAL_SUPPLY - 3).toString());
        });

        it('can deposit tokens to the DEX smart contract.', async function () {
            // Insverstor buys USDX
            await this.crowdsale.sendTransaction({ from: this.investor1, value: USDXToWei(2000)});

            // Investor buys AAPL shares with USDX
            await this.stockICO.buyStock(600, { from: this.investor1 });

            let investorUSDXBalance = await this.fiat.balanceOf(this.investor1);
            let investorAAPLBalance = await this.stock.balanceOf(this.investor1);
            let dexUSDXBalance = await this.fiat.balanceOf(this.DEX.address);
            let dexAAPLBalance = await this.stock.balanceOf(this.DEX.address);
            console.log("INV USDX: " + investorUSDXBalance.toString());
            console.log("DEX USDX: " + dexUSDXBalance.toString());
            console.log("INV AAPL: " + investorAAPLBalance.toString());
            console.log("DEX AAPL: " + dexAAPLBalance.toString());

            // Investor deposit USDX to DEX smart contract.
            await this.DEX.deposit(this.fiat.address, USDXToWei(1000), { from: this.investor1 });
            await this.DEX.deposit(this.stock.address, 2, { from: this.investor1 });

            investorUSDXBalance = await this.fiat.balanceOf(this.investor1);
            investorAAPLBalance = await this.stock.balanceOf(this.investor1);
            dexUSDXBalance = await this.fiat.balanceOf(this.DEX.address);
            dexAAPLBalance = await this.stock.balanceOf(this.DEX.address);
            console.log("INV USDX: " + investorUSDXBalance.toString());
            console.log("DEX USDX: " + dexUSDXBalance.toString());
            console.log("INV AAPL: " + investorAAPLBalance.toString());
            console.log("DEX AAPL: " + dexAAPLBalance.toString());
        });
    });

    describe('matching engine', function () {
        it('can send trades to DEX smart contract', async function () {
            // Insverstor buys USDX
            await this.crowdsale.sendTransaction({ from: this.investor1, value: USDXToWei(2000)});
            await this.crowdsale.sendTransaction({ from: this.investor2, value: USDXToWei(2000)});

            // Investor buys AAPL shares with USDX
            await this.stockICO.buyStock(600, { from: this.investor1 });
            await this.stockICO.buyStock(1000, { from: this.investor2 });

            await printBalances(this);

            // Investor deposit USDX to DEX smart contract.
            await this.DEX.deposit(this.fiat.address, USDXToWei(1000), { from: this.investor1 });
            await this.DEX.deposit(this.fiat.address, USDXToWei(1000), { from: this.investor2 });
            await this.DEX.deposit(this.stock.address, 2, { from: this.investor1 });
            await this.DEX.deposit(this.stock.address, 4, { from: this.investor2 });

            await printBalances(this);

            const tokenMaker = this.stock.address;
            const tokenTaker = this.fiat.address;
            const amountMaker = 1;
            const amountTaker = 210;
            const addressMaker = this.investor1;
            const addressTaker = this.investor2;
            const nonce = '0x7f';
            // const contractAddress = contracts.dex.options.address; // used to prevent replay attacks.

            // Construct message.
            let msg =  abi.soliditySHA3(
                ["address", "address", "uint256", "uint256", "address", "address", "uint256"],
                [tokenMaker, tokenTaker, amountMaker, amountTaker, addressMaker, addressTaker, nonce]
            );
            console.log(msg);

            // Sign msg.
            const MATCHING_ENGINE_PK = '0xc1cbe2100aed68260d5b8219d3a9e0441827ed52f047163b30c36348f00b8362';
            let signatureObject = await web3.eth.accounts.sign(
                "0x" + msg.toString("hex"),
                MATCHING_ENGINE_PK
            );
            console.log(signatureObject);

            let signature = signatureObject.signature;
            console.log(signature);

            await this.DEX.trade(
                tokenMaker,
                tokenTaker,
                amountMaker,
                amountTaker,
                addressMaker,
                addressTaker,
                nonce,
                signature,
                { from: this.matchingEngine }
            );
        });
    });

    async function printBalances(that) {
        let investor1USDXBalance = await that.fiat.balanceOf(that.investor1);
        let investor1AAPLBalance = await that.stock.balanceOf(that.investor1);
        let investor2USDXBalance = await that.fiat.balanceOf(that.investor2);
        let investor2AAPLBalance = await that.stock.balanceOf(that.investor2);
        let dexUSDXBalance = await that.fiat.balanceOf(that.DEX.address);
        let dexAAPLBalance = await that.stock.balanceOf(that.DEX.address);
        console.log("INV_1 USDX: " + investor1USDXBalance.toString());
        console.log("INV_2 USDX: " + investor2USDXBalance.toString());
        console.log("INV_1 AAPL: " + investor1AAPLBalance.toString());
        console.log("INV_2 AAPL: " + investor2AAPLBalance.toString());
        console.log("DEX USDX: " + dexUSDXBalance.toString());
        console.log("DEX AAPL: " + dexAAPLBalance.toString());
    }
});


