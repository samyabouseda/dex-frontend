import React, {Component} from "react";
import FiatCrowdsale from "./contracts/FiatCrowdsale";
import Fiat from "./contracts/Fiat";
import Stock from "./contracts/Stock";
import StockICO from "./contracts/StockICO";
import DEX from "./contracts/DEX";
import getWeb3 from "./utils/getWeb3";
import "./App.css";

const Tx = require('ethereumjs-tx').Transaction;

class App extends Component {
    state = {
        // Web3
        web3: null,
        accounts: null,

        // Accounts
        accountName: '',
        accountPassword: '',
        accountNameError: '',
        accountAddress: '',
        isLogged: false,
        session: null,

        // Assets
        listedAssets: [
            // TODO: Get the metadata dynamically.
            { name: "Ethereum", symbol: "ETH", balanceOf: 0 },
            { name: "US Dollar X", symbol: "USDX", balanceOf: 0 },
            { name: "Apple Inc.", symbol: "AAPL", balanceOf: 0 },
            { name: "Microsoft Corp.", symbol: "MSFT", balanceOf: 0 },
        ],

        // Trade
        fiatToBuy: 0,
        stockToBuy: 0,

        // Contracts
        contracts: {},

    };

    componentDidMount = async () => {
        try {
            const web3 = await getWeb3();
            const accounts = await web3.eth.getAccounts();
            const contracts = await this.initContracts(web3);
            this.initEventWatching(contracts);
            this.initAccount(web3);
            this.setState({ web3, accounts, contracts });
        } catch (error) {
            alert(
                `Failed to load web3, accounts, or contract. Check console for details.`,
            );
            console.error(error);
        }
    };

    initContracts = async web3 => {
        // Fiat
        const fiat = await this.initContract(Fiat, web3);
        const crowdsale = await this.initContract(FiatCrowdsale, web3);

        // Stock
        const stock = await this.initContract(Stock, web3);
        const stockCrowdalse = await this.initContract(StockICO, web3);

        // DEX
        const dex = await this.initContract(DEX, web3);

        return {
            fiat: fiat,
            crowdsale: crowdsale,
            stock: stock,
            stockCrowdalse: stockCrowdalse,
            dex: dex,
        };
    };

    initContract = async (contract, web3) => {
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = contract.networks[networkId];
        return await new web3.eth.Contract(
            contract.abi,
            deployedNetwork && deployedNetwork.address,
        );
    };

    initEventWatching = async contracts => {
        contracts.crowdsale.events.TokensPurchased({}, async (error, event) => {
            if (error) console.log(error);
            else console.log(event);
        });
    };

    initAccount = async web3 => {
        const sessionString = localStorage.getItem('trading.session');
        if (sessionString != null) {
            const session = await JSON.parse(sessionString);
            this.setState({
                isLogged: session.isLogged,
                accountName: session.accountName,
                accountAddress: session.address,
                session,
            });
            this.updateBalancesOf(session.address);
        }
    };

    updateBalancesOf = async (account) => {
        const ethBalance = await this.getEtherBalanceOf(account);
        const usdxBalance = await this.getUSDXBalanceOf(account);
        const aaplBalance = await this.getAAPLBalanceOf(account);
        let listedAssets = this.state.listedAssets;
        listedAssets[0].balanceOf = ethBalance;
        listedAssets[1].balanceOf = usdxBalance;
        listedAssets[2].balanceOf = aaplBalance;
        this.setState({ listedAssets });
    };

    render() {
        if (!this.state.web3) {
            return <div>Loading Web3, accounts, and contract...</div>;
        }
        return (
            <div className="App">
                <h1>Decentralized Stock Exchange</h1>
                {!this.state.isLogged && this.renderUIforLoggedOutUser()}
                {this.state.isLogged && this.renderUIforLoggedUser()}
            </div>
        );
    }

    renderUIforLoggedOutUser = () =>
        <div>
            <h2>Account creation</h2>
            <form onSubmit={this.createAccount}>
                <p>{this.state.accountNameError}</p>
                <input type="text" name="accountName" placeholder="Account name"
                       onChange={this.handleAccountFormChange}/>
                <input type="password" name="accountPassword" placeholder="password"
                       onChange={this.handleAccountFormChange}/>
                <button type="submit" name="createAccountButton">Create account</button>
            </form>

            <h2>Login</h2>
            <form onSubmit={this.handleLogin}>
                <input type="text" name="accountName" placeholder="Account name"
                       onChange={this.handleAccountFormChange}/>
                <input type="password" name="accountPassword" placeholder="password"
                       onChange={this.handleAccountFormChange}/>
                <button type="submit" name="loginButton">Login</button>
            </form>
        </div>;

    renderUIforLoggedUser = () =>
        <div>
            <header>
                <p>Account name: {this.state.accountName}</p>
                <p>Account address: {this.state.accountAddress}</p>
                <p>ETH: {this.state.listedAssets[0].balanceOf}</p>
                <p>USDX: {this.state.listedAssets[1].balanceOf}</p>
                <button onClick={this.handleLoggout}>Logout</button>
            </header>

            <section>
                <div>
                    <button onClick={this.getEther}>Get Ether</button>
                </div>

                <div>
                    <input type="text" name="fiatToBuy" placeholder="Amount in USDX" onChange={this.handleFiatInputChange} />
                    <button onClick={this.buyFiat}>Buy fiat</button>
                </div>

                <div>
                    <input type="text" name="stockToBuy" placeholder="Amount in USDX" onChange={this.handleStockInputChange}/>
                    <button onClick={this.buyStock}>Buy stock</button>
                </div>

                <div>
                    <button onClick={this.deposit}>Deposit</button>
                </div>
            </section>
            <div>
                <h3>Porfolio assets</h3>
                <div>
                    <h4>Fiat Token</h4>
                    <table>
                        <tbody>
                        <tr>
                            <th>Asset</th>
                            <th>Symbol</th>
                            <th>Total</th>
                        </tr>
                        </tbody>
                        <tbody>
                        {this.renderAssets(this.state.listedAssets)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>;

    renderAssets = assets => assets.map((asset, key) => this.renderAsset(asset, key));

    renderAsset = (asset, key) =>
        <tr key={key}>
            <td>{asset.name}</td>
            <td>{asset.symbol}</td>
            <td>{asset.balanceOf}</td>
        </tr>;

    handleAccountFormChange = (event) => {
        const text = event.target.value;
        const name = event.target.name;
        this.setState({[name]: text});
        if (name === 'accountName') {
            if (localStorage.getItem(text) != null) {
                this.setState({accountNameError: "Account with the name " + text + " already exists."});
            } else {
                this.setState({accountNameError: ''});
            }
        }
    };

    handleFiatInputChange = (event) => {
        const text = event.target.value;
        this.setState({ fiatToBuy: text });
    };

    handleStockInputChange = (event) => {
        const text = event.target.value;
        this.setState({ stockToBuy: text });
    };

    createAccount = async (event) => {
        event.preventDefault();
        const {web3, accountName, accountPassword} = this.state;
        const account = web3.eth.accounts.create();
        const encryptedAccount = web3.eth.accounts.encrypt(account.privateKey, accountPassword);
        localStorage.setItem(accountName, JSON.stringify(encryptedAccount));
        this.login(accountName, accountPassword);
    };

    handleLogin = (event) => {
        const { accountName, accountPassword } = this.state;
        event.preventDefault();

        const accountExists = localStorage.getItem(accountName) != null;
        if (accountExists) this.login(accountName, accountPassword);
        else alert("The account " + accountName + " doesn't exists.");
    };

    login = async (name, password) => {
        const { web3 } = this.state;
        // Decrypt account
        const encryptedAccount = JSON.parse(localStorage.getItem(name));
        const account = web3.eth.accounts.decrypt(encryptedAccount, password);

        // Store session cookie.
        const session = {
            accountName: name,
            address: account.address,
            pk: account.privateKey,
            isLogged: true,
        };
        localStorage.setItem('trading.session', JSON.stringify(session));

        const ethBalance = await this.getEtherBalanceOf(session.address);
        const usdxBalance = await this.getUSDXBalanceOf(session.address);
        // Update app state
        this.setState({accountAddress: account.address, isLogged: true, session, ethBalance, usdxBalance});
    };

    handleLoggout = () => {
        localStorage.removeItem('trading.session');
        this.setState({
            isLogged: false,
            accountName: '',
            accountAddress: '',
            session: null,
        });
    };

    getEtherBalanceOf = async address => {
        const { web3 } = this.state;
        const balance = await web3.eth.getBalance(address);
        return await web3.utils.fromWei(balance);
    };

    getUSDXBalanceOf = async address => {
        const { web3, contracts } = this.state;
        const balance = await contracts.fiat.methods.balanceOf(address).call();
        return await web3.utils.fromWei(balance);
    };

    getAAPLBalanceOf = async address => {
        const { contracts } = this.state;
        const balance = await contracts.stock.methods.balanceOf(address).call();
        console.log(balance);
        return balance;
    };

    getEther = async () => {
        const { accounts, session, web3 } = this.state;

        // Suggar account
        const suggar = {
            address: accounts[0],
            privateKey: '0x17437df3163604090b5254f80bbffeb654b76221fdeef525a2e79fc27060d0a8'.substr(2),
        };
        const to = session.address;
        const value = web3.utils.toHex(web3.utils.toWei('0.5', 'ether'));
        const data = '';

        await this.sendTransaction(suggar, to, value, data, true);

        this.updateBalancesOf(session.address);
    };

    buyFiat = async () => {
        const { session, contracts, fiatToBuy } = this.state;

        // Rate should/could be dynamic.
        const rate = await contracts.crowdsale.methods.rate().call();
        const from = {
            address: session.address,
            privateKey: session.pk.substr(2),
        };
        const to = contracts.crowdsale.options.address;
        const value = fiatToBuy / rate * 1000000000000000000;

        await this.sendTransaction(from, to, value, '');

        this.updateBalancesOf(session.address);
    };

    sellFiat = async () => {
        // Sell the amount of fiat entered in the input.
        // Transfer fiat to crowdsale and receive Ether.
        // Update balances in state.
    };

    buyStock = async () => {
        const { contracts, session, web3 } = this.state;
        const from = {
            address: session.address,
            privateKey: session.pk.substr(2),
        };
        const to = contracts.stockCrowdalse.options.address;
        const jsonInterface = {
            name: 'buyStock',
            type: 'function',
            inputs: [
                {
                    type: 'uint256',
                    name: '_fiatAmount'
                },
            ]
        };
        const parameters = [this.state.stockToBuy];
        const data = web3.eth.abi.encodeFunctionCall(jsonInterface, parameters);
        const value = '';

        this.sendTransaction(from, to, value, data);

        this.updateBalancesOf(session.address);
    };

    deposit = async () => {
        const { contracts, session, web3 } = this.state;

        // Routing setup.
        const from = {
            address: session.address,
            privateKey: session.pk.substr(2),
        };
        const to = contracts.dex.options.address;

        // Build deposit object.
        // const jsonInterface = this.getJsonInterfaceFor(contract, functionName);
        // const deposit = this.getEncodedFunctionCall(jsonInterface, params); params is array
        const jsonInterface = {
            name: 'deposit',
            type: 'function',
            inputs: [
                {
                    type: 'address',
                    name: 'token'
                },
                {
                    type: 'uint256',
                    name: 'amount'
                },
            ]
        };
        const params = [contracts.fiat.options.address, 10000000000000];
        const data = web3.eth.abi.encodeFunctionCall(jsonInterface, params);
        const value = '';

        this.sendTransaction(from, to, value, data);

        this.updateBalancesOf(session.address);
        let dexBalance = await contracts.fiat.methods.balanceOf(contracts.dex.options.address).call();
        console.log(dexBalance);
    };

    placeOrder = async () => {
        // Build order object
        // Sing order object
        // sender order objet and signature to Order Book
    };

    sendTransaction = async (from, to, value, data) => {
        // Build transaction object.
        const txObject = await this.buildTransactionObject(from, to, value, data);

        // Sign transaction object.
        const tx = this.signTransaction(txObject, from.privateKey);

        // Broadcast the transaction.
        await this.sendSignedTransaction(tx);
    };

    buildTransactionObject = async (from, to, value, data) => {
        const { web3 } = this.state;
        return new Promise(async function(resolve, reject) {
            let txObject;
            try {
                const txCount = await web3.eth.getTransactionCount(from.address);
                txObject = {
                    nonce: web3.utils.toHex(txCount),
                    to: to,
                    data: data,
                    value: value,
                    gasLimit: web3.utils.toHex(210000),
                    gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei'))
                };
                resolve(txObject);
            } catch(error) {
                reject(error);
            }
        });
    };

    signTransaction = (txData, privateKey) => {
        const bufferedPk = Buffer.from(privateKey, 'hex');
        let tx;
        try {
            tx = new Tx(txData);
            tx.sign(bufferedPk);
        } catch(error) {
            console.log(error);
        }
        const serializedTx = tx.serialize();
        return '0x' + serializedTx.toString('hex');
    };

    sendSignedTransaction = async tx => {
        const { web3 } = this.state;
        await web3.eth.sendSignedTransaction(tx, (err, txHash) => {
            if (err) console.log(err);
            else console.log('txHash: ', txHash);
        });
    };

}


export default App;
