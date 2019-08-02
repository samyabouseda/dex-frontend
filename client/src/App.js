import React, { Component } from "react";
import FiatCrowdsale from "./contracts/FiatCrowdsale.json";
import Fiat from "./contracts/Fiat";
import getWeb3 from "./utils/getWeb3";

import "./App.css";

class App extends Component {
  state = {
      storageValue: 0, web3: null, accounts: null, crowdsale: null, symbol: null, name: null,
      decimals: null,
      supply: null,
      balanceOf: 0,
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = FiatCrowdsale.networks[networkId];
      const crowdsale = new web3.eth.Contract(
          FiatCrowdsale.abi,
          deployedNetwork && deployedNetwork.address,
      );

      const deployedNetworkFiat = Fiat.networks[networkId];
      const fiat = await new web3.eth.Contract(
          Fiat.abi,
          deployedNetworkFiat && deployedNetworkFiat.address,
      );

      const decimals = await fiat.methods.decimals().call();
      const name = await fiat.methods.name().call();

      console.log("sendTransaction");
      const txHash = await web3.eth.sendTransaction({ from: accounts[0], to: crowdsale.address, value: 5000000000000000000});
      console.log(txHash);

      const supply = await fiat.methods.totalSupply().call();

      console.log("balanceOf");
      const balanceOf = await fiat.methods.balanceOf(accounts[0]).call();

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, crowdsale, name, decimals, supply, balanceOf }, this.runExample);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  runExample = async () => {
    const { web3 } = this.state;

      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Fiat.networks[networkId];
      const fiat = new web3.eth.Contract(
          Fiat.abi,
          deployedNetwork && deployedNetwork.address,
      );

      const symbol = await fiat.methods.symbol().call();

    this.setState({ symbol: symbol });
  };

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <h2>Fiat</h2>
        <div>Fiat symbol: {this.state.symbol}</div>
        <div>Fiat name: {this.state.name}</div>
          <div>Fiat decimals: {this.state.decimals}</div>
          <div>Fiat total supply: {this.state.supply}</div>
          <div>Balance of account 0: {this.state.balanceOf}</div>
      </div>
    );
  }
}

export default App;
