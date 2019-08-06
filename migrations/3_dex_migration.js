const DEX = artifacts.require('DEX');

module.exports = async function(deployer, network, accounts) {
    let dexOwner;

    if (network === "live") {
        // Do something specific to the network named "live".
    } else {
        dexOwner = await accounts[8];
    }

    await deployer.deploy(DEX, '0x4625382e88790b76E5bAD2e9c8E724211cDDd011');
};