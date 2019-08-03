import React, {Component} from "react";
import FiatCrowdsale from "./contracts/FiatCrowdsale.json";
import Fiat from "./contracts/Fiat";
import getWeb3 from "./utils/getWeb3";
import "./App.css";

const Tx = require('ethereumjs-tx').Transaction;

class App extends Component {
    state = {
        web3: null,
        accounts: null,
        decimals: null,
        supply: null,
        balanceOf: 0,

        // Accounts
        accountName: '',
        accountPassword: '',
        accountNameError: '',
        accountAddress: '',
        isLogged: false,
        listedAssets: [
            { name: "US Dollar X", symbol: "USDX", balanceOf: "500" },
            { name: "Ethereum", symbol: "ETH", balanceOf: "130" }
        ],

        // Tokens
        name: '',
    };

    componentDidMount = async () => {
        try {
            // Get network provider and web3 instance.
            const web3 = await getWeb3();
            const accounts = await web3.eth.getAccounts();
            const contracts = await this.initContracts(web3);
            this.initEventWatching(contracts);
            this.initAccount();

            // // Get the contract instance.
            // const networkId = await web3.eth.net.getId();
            // const deployedNetwork = FiatCrowdsale.networks[networkId];
            // const crowdsale = new web3.eth.Contract(
            //     FiatCrowdsale.abi,
            //     deployedNetwork && deployedNetwork.address,
            // );
            //
            // const deployedNetworkFiat = Fiat.networks[networkId];
            // const fiat = await new web3.eth.Contract(
            //     Fiat.abi,
            //     deployedNetworkFiat && deployedNetworkFiat.address,
            // );

            // const symbol = await fiat.methods.symbol().call();
            // const decimals = await fiat.methods.decimals().call();
            // const name = await fiat.methods.name().call();
            // let balanceOf = await fiat.methods.balanceOf(accounts[1]).call();
            // let supply = await fiat.methods.totalSupply().call();

            // init event watching
            // crowdsale.events.TokensPurchased({}, async (error, event) => {
            //     if (error) console.log(error);
            //     else {
            //         balanceOf = await fiat.methods.balanceOf(accounts[1]).call();
            //         supply = await fiat.methods.totalSupply().call();
            //         this.setState({supply, balanceOf});
            //     }
            // });

            this.setState({web3, accounts, contracts });

        } catch (error) {
            // Catch any errors for any of the above operations.
            alert(
                `Failed to load web3, accounts, or contract. Check console for details.`,
            );
            console.error(error);
        }
    };

    initContracts = async web3 => {
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

    initAccount = () => {
        const session = JSON.parse(localStorage.getItem('trading.session'));
        if (session != null) {
            this.setState({
                isLogged: session.isLogged,
                accountName: session.accountName,
                accountAddress: session.address
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

                {/* ACCOUNT CREATION */}
                {!this.state.isLogged &&
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
                </div>
                }

                {this.state.isLogged &&
                <div>
                    <header>
                        <p>Account name: {this.state.accountName}</p>
                        <p>Account address: {this.state.accountAddress}</p>
                        <button onClick={this.handleLoggout}>Logout</button>
                    </header>
                    <div>
                        <h3>Porfolio assets</h3>
                        {this.state.name}
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
                </div>
                }
            </div>
        );
    }

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

    login = (name, password) => {
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

        // Update app state
        this.setState({accountAddress: account.address, isLogged: true});
    };

    handleClick = async () => {
        // try {
        //     console.log(web3.eth.accounts.decrypt(privateKey, 'basdf'));
        // } catch (error) {
        //     console.log("Wrong password");
        // }
        const {web3, accounts, crowdsale, fiat} = this.state;
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

    handleLoggout = () => {
        localStorage.removeItem('trading.session');
        this.setState({
            isLogged: false,
            accountName: '',
            accountAddress: ''
        });
    }

}


export default App;
