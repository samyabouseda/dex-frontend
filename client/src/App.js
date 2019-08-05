import React, {Component} from "react";
import FiatCrowdsale from "./contracts/FiatCrowdsale.json";
import Fiat from "./contracts/Fiat";
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
        ethBalance: 0,
        usdxBalance: 0,
        listedAssets: [
            { name: "US Dollar X", symbol: "USDX", balanceOf: "500" },
            { name: "Ethereum", symbol: "ETH", balanceOf: "130" }
        ],

        // Trade
        fiatToBuy: 0,

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
        // Get the contract instances.
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

        return {
            fiat: fiat,
            crowdsale: crowdsale
        };
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
            const ethBalance = await this.getEtherBalanceOf(session.address);
            const usdxBalance = await this.getUSDXBalanceOf(session.address);
            this.setState({
                isLogged: session.isLogged,
                accountName: session.accountName,
                accountAddress: session.address,
                ethBalance,
                usdxBalance,
                session,
            });
        }
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
                <p>ETH: {this.state.ethBalance}</p>
                <p>USDX: {this.state.usdxBalance}</p>
                <button onClick={this.getEther}>Get Ether</button>

                <div>
                    <input type="text" name="fiatToBuy" placeholder="Amount in USDX" onChange={this.handleFiatInputChange} />
                    <button onClick={this.buyFiat}>Buy fiat</button>
                </div>
                <button onClick={this.handleLoggout}>Logout</button>
            </header>
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

    getEther = async () => {
        const { accounts, session } = this.state;

        // Suggar account
        const suggar = {
            address: accounts[0],
            pk: '0x17437df3163604090b5254f80bbffeb654b76221fdeef525a2e79fc27060d0a8'
        };

        const recipient = session.address;
        await this.sendTransaction(suggar, recipient, 0.5);

        const ethBalance = await this.getEtherBalanceOf(session.address);
        this.setState({ ethBalance });
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

    sendTransaction = async (from, to, value) => {
        const { web3 } = this.state;
        const bufferedPk = Buffer.from(from.pk.substr(2), 'hex');

        try {
            // Build transaction
            const txCount = await web3.eth.getTransactionCount(from.address);
            const txObject = {
                nonce: web3.utils.toHex(txCount),
                to: to,
                value: web3.utils.toHex(web3.utils.toWei(value.toString(), 'ether')),
                gasLimit: web3.utils.toHex(210000),
                gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei'))
            };

            console.log(txObject);

            let tx;
            try {
                // Sign the transaction
                tx = new Tx(txObject);
                tx.sign(bufferedPk);
            } catch(error) {
                console.log("signing didn't work.")
            }

            const serializedTx = tx.serialize();
            const raw = '0x' + serializedTx.toString('hex');

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction(raw, (err, txHash) => {
                if (err) console.log(err);
                else console.log('txHash: ', txHash);
            });

        } catch(error) {
            alert("Could not send transaction.");
            console.log(error);
        }
    };

    buyFiat = async () => {
        const { session, contracts, web3, fiatToBuy } = this.state;

        const encryptedAccount = JSON.parse(localStorage.getItem(this.state.accountName));
        const account = web3.eth.accounts.decrypt(encryptedAccount, 'foobar');

        // Rate should/could be dynamic.
        const rate = await contracts.crowdsale.methods.rate().call();

        const from = {
            address: account.address,
            pk: account.privateKey,
        };
        const to = contracts.crowdsale.options.address;
        const value = fiatToBuy / rate;

        await this.sendTransaction(from, to, value);

        const usdxBalance = await this.getUSDXBalanceOf(session.address);
        this.setState({ usdxBalance });
    };

}


export default App;
