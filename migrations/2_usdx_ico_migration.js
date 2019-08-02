const Fiat = artifacts.require('Fiat');
const FiatCrowdsale = artifacts.require('FiatCrowdsale');

module.exports = async function(deployer, network, accounts) {
    let owner;

    if (network === "live") {
        // Do something specific to the network named "live".
    } else {
        owner = await accounts[0];
    }

    const fiat = await deployer.deploy(
        Fiat,
        "US Dollar",
        "USDX",
        2,
        // from address goes here.
    );

    const rate = 200;
    const fiatCrowdsale = await deployer.deploy(
        FiatCrowdsale,
        rate,
        owner,
        fiat.address,
        // from address goes here.
    );

    await fiat.addMinter(fiatCrowdsale.address);
    await fiat.transferOwnership(fiatCrowdsale.address);

    // Federal Reserve mints initial supply.
    await fiat.mint(owner, 1700000000000000, { from: owner });
};
