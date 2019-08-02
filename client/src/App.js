import React, { Component } from "react";
import FiatCrowdsale from "./contracts/FiatCrowdsale.json";
import Fiat from "./contracts/Fiat";
import getWeb3 from "./utils/getWeb3";
import "./App.css";
const Tx = require('ethereumjs-tx').Transaction;

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

      const symbol = await fiat.methods.symbol().call();
      const decimals = await fiat.methods.decimals().call();
      const name = await fiat.methods.name().call();
      let balanceOf = await fiat.methods.balanceOf(accounts[1]).call();
      let supply = await fiat.methods.totalSupply().call();

        crowdsale.events.TokensPurchased({}, async (error, event) => {
            if (error) console.log(error);
            else {
                balanceOf = await fiat.methods.balanceOf(accounts[1]).call();
                supply = await fiat.methods.totalSupply().call();
                this.setState({supply, balanceOf});
            }
        });

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, crowdsale, name, decimals, supply, balanceOf, symbol, fiat }); //, this.runExample);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
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
        <button onClick={this.handleClick}>Send</button>
      </div>
    );
  }

  handleClick = async () => {
    const { web3, accounts, crowdsale, fiat } = this.state;
      // console.log("sendTransaction");
      // const txHash = await web3.eth.sendTransaction({ from: accounts[1], to: crowdsale.address, value: 50000000000000000}, async receipt =>{
      //   console.log("TOKENS PURCHASED");
      //   let balanceOf = await fiat.methods.balanceOf(accounts[1]).call();
      //   console.log(balanceOf);
      // });
      // console.log(txHash);
      // const balanceOf = await fiat.methods.balanceOf(accounts[1]).call();
      // console.log(balanceOf);

      const recepient = accounts[2];
      const PK = 'cdfc4f16d1f8c950cca8291fc3436444b44f7bda200d58e25652231b4919dc88';

      const bPK = Buffer.from(PK, 'hex');

      await web3.eth.getTransactionCount(accounts[1], async (err, txCount) => {
          // Build transaction
          const txObject = {
              nonce: web3.utils.toHex(txCount),
              to: crowdsale.options.address,
              value: web3.utils.toHex(web3.utils.toWei('0.005')),
              gasLimit: web3.utils.toHex(210000),
              gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei'))
          };

          // Sign the transaction
          const tx = new Tx(txObject);
          tx.sign(bPK);

          const serializedTx = tx.serialize();
          const raw = '0x' + serializedTx.toString('hex');


          // Broadcast the transaction
          await web3.eth.sendSignedTransaction(raw, (err, txHash) => {
              if (err) console.log(err);
              else console.log('txHash: ', txHash);
          });
      });
  }
}

export default App;
