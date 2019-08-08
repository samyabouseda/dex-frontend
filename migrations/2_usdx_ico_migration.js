const Fiat = artifacts.require('Fiat');
const FiatCrowdsale = artifacts.require('FiatCrowdsale');
const Stock = artifacts.require('Stock');
const StockICO = artifacts.require('StockICO');
const AAPL_INITIAL_SUPPLY = 4601075000;
const MSFT_INITIAL_SUPPLY = 7662818000;

module.exports = async function(deployer, network, accounts) {
    let owner;
    let appleWallet;
    let msftWallet;

    if (network === "live") {
        // Do something specific to the network named "live".
    } else {
        owner = await accounts[0];
        appleWallet = await accounts[1];
        msftWallet = await accounts[2];
    }

    const fiat = await deployer.deploy(
        Fiat,
        "US Dollar",
        "USDX",
        2,
        { from: owner },
    );

    const rate = 200;
    const fiatCrowdsale = await deployer.deploy(
        FiatCrowdsale,
        rate,
        owner,
        fiat.address,
        { from: owner },
    );
    await fiat.addMinter(fiatCrowdsale.address);
    await fiat.transferOwnership(fiatCrowdsale.address);

    // Federal Reserve mints initial supply. Really needed ?
    await fiat.mint(owner, 1700000000000000, { from: owner });

    // Stock config
    const stock = await deployer.deploy(
        Stock,
        "Apple Inc.",
        "AAPL",
        AAPL_INITIAL_SUPPLY,
        { from: appleWallet }
    );

    // StockICO config
    const pricePerShare = 200;
    const stockICO = await deployer.deploy(
        StockICO,
        stock.address,
        fiat.address,
        pricePerShare,
        { from: appleWallet }
    );
    await stock.transfer(stockICO.address, AAPL_INITIAL_SUPPLY, { from: appleWallet });
    await stock.transferOwnership(stockICO.address, { from: appleWallet });


    // MSFT TOKEN

    // // Stock config
    // const msft = await deployer.deploy(
    //     Stock,
    //     "Microsoft Corporation",
    //     "MSFT",
    //     MSFT_INITIAL_SUPPLY,
    //     { from: msftWallet }
    // );
    //
    // // StockICO config
    // const msftPricePerShare = 100;
    // const msftICO = await deployer.deploy(
    //     StockICO,
    //     msft.address,
    //     fiat.address,
    //     msftPricePerShare,
    //     { from: msftWallet }
    // );
    // await msft.transfer(msftICO.address, MSFT_INITIAL_SUPPLY, { from: msftWallet });
    // await msft.transferOwnership(msftICO.address, { from: msftWallet });
};
