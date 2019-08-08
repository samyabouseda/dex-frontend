const DEX = artifacts.require('DEX');

module.exports = async function(deployer, network, accounts) {
    let dexOwner;

    if (network === "live") {
        // Do something specific to the network named "live".
    } else {
        dexOwner = await accounts[8];
    }

    await deployer.deploy(DEX, '0x8FC9b674Aa37B879F6E9B096C8dB63f92d63A446');
};