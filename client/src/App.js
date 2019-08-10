import React, {Component} from "react";
import FiatCrowdsale from "./contracts/FiatCrowdsale";
import Fiat from "./contracts/Fiat";
import Stock from "./contracts/Stock";
import StockICO from "./contracts/StockICO";
import DEX from "./contracts/DEX";
import getWeb3 from "./utils/getWeb3";
import "./App.css";

import axios from "axios";

const abi = require('ethereumjs-abi');
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
            {name: "Ethereum", symbol: "ETH", balanceOf: 0, price: 0, total: 0},
            {name: "US Dollar X", symbol: "USDX", balanceOf: 0, price: 0, total: 0},
            {name: "Apple Inc.", symbol: "AAPL", balanceOf: 0, price: 0, total: 0},
            // {name: "Microsoft Corp.", symbol: "MSFT", balanceOf: 0},
        ],
        depositOnDex: 0,
        aaplDepositOnDex: 0,

        // Trade
        fiatToBuy: 0,
        stockToBuy: 0,
        fiatDeposit: 0,
        aaplDeposit: 0,

        // Contracts
        contracts: {},


        // New UI
        stockList: [
            {symbol: "AAPL", name: "Apple Inc.", price: 0, bid: 0, ask: 0},
            // {symbol: "MSFT", name: "Microsoft Corporation", price: 135.28, bid: 0, ask: 0},
            // {symbol: "INTC", name: "Intel Corporation", price: 46.73, bid: 0, ask: 0},
            // {symbol: "TSLA", name: "Tesla Inc.", price: 234.50, bid: 0, ask: 0},
        ],
        orderList: [
            {
                symbol: "AAPL",
                name: "Apple Inc.",
                status: "FILLED",
                time: "15.03.45",
                side: "SELL",
                qty: "20",
                price: 200.00
            },
            {
                symbol: "AAPL",
                name: "Apple Inc.",
                status: "FILLED",
                time: "15.03.45",
                side: "BUY",
                qty: "45",
                price: 199.04
            },
            {
                symbol: "AAPL",
                name: "Apple Inc.",
                status: "CANCELLED",
                time: "15.03.45",
                side: "SELL",
                qty: "45",
                price: 199.04
            },
            {
                symbol: "MSFT",
                name: "Microsoft Corporation",
                status: "FILLED",
                time: "15.03.45",
                side: "SELL",
                qty: "45",
                price: 199.04
            },
            {
                symbol: "TSLA",
                name: "Tesla Inc.",
                status: "FILLED",
                time: "15.03.45",
                side: "BUY",
                qty: "45",
                price: 199.04
            },
            {
                symbol: "INTC",
                name: "Inter Corporation",
                status: "FILLED",
                time: "15.03.45",
                side: "SELL",
                qty: "45",
                price: 199.04
            },
            {
                symbol: "TSLA",
                name: "Tesla Inc.",
                status: "FILLED",
                time: "15.03.45",
                side: "BUY",
                qty: "45",
                price: 199.04
            },
        ],
        bids: [],
        highestBid: {bid: 0, size: 0, total: 0},
        asks: [],
        lowestAsk: {ask: 0, size: 0, total: 0},
        orderEntry: {
            orderType: 'Limit',
            tokenMaker: null, // BUY : tokenMaker = USDX, tokenTaker = STOCK     STOCK is the current selected stock
            tokenTaker: null, // SELL: tokenMaker = STOCK, tokenTaker = USDX     USDX is fiat token.
            shares: 0,
            price: 0,
            totalPrice: 0,
            side: 'BUY',
        }
    };

    componentDidMount = async () => {
        this.interval = setInterval(() => {
            this.loadBidAsk();
        }, 1000);
        try {
            const web3 = await getWeb3();
            const accounts = await web3.eth.getAccounts();
            const contracts = await this.initContracts(web3);
            this.initEventWatching(contracts);
            this.initAccount(web3);
            this.loadBidAsk();
            this.setState({web3, accounts, contracts});
        } catch (error) {
            alert(
                `Failed to load web3, accounts, or contract. Check console for details.`,
            );
            console.error(error);
        }
    };

    componentWillUnmount() {
        clearInterval(this.interval);
    }

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

    loadBidAsk = async () => {
        try {
            let asks = await axios.get("http://127.0.0.1:8000/orders?side=ask");
            let bids = await axios.get("http://127.0.0.1:8000/orders?side=bid");
            asks = asks.data;
            bids = bids.data;
            if (asks.length > 0) {
                const lowestAsk = asks[asks.length - 1];
                this.setState({lowestAsk});
            }
            if (bids.length > 0) {
                const highestBid = bids[0];
                this.setState({ highestBid });
            }
            this.setState({ bids: bids, asks: asks });
        } catch(error) {
            console.log(error);
        }
    };

    updateBalancesOf = async (account) => {
        let listedAssets = this.state.listedAssets;
        // ETH
        const ethBalance = await this.getEtherBalanceOf(account);
        let ethPrice = 200;
        try {
            const ethRes = await axios.get("https://api.coinmarketcap.com/v1/ticker/ethereum/");
            ethPrice = Math.round(ethRes.data[0].price_usd * 100) / 100;
        } catch (error) {
            console.log(error);
        }
        listedAssets[0].balanceOf = ethBalance;
        listedAssets[0].price = await ethPrice;

        // FIAT
        const usdxBalance = await this.getUSDXBalanceOf(account);
        listedAssets[1].balanceOf = usdxBalance;
        listedAssets[1].price = 1;

        // STOCK
        const aaplBalance = await this.getAAPLBalanceOf(account);
        listedAssets[2].balanceOf = aaplBalance;
        listedAssets[2].price = this.state.lowestAsk.ask;

        // DEX
        const usdxDepositOnDex = await this.getUSDXDepositOnDex(account);
        const aaplDepositOnDex = await this.getAAPLDepositOnDex(account);

        this.setState({listedAssets, depositOnDex: usdxDepositOnDex, aaplDepositOnDex});
    };

    render() {
        if (!this.state.web3) {
            return <h3>Loading Web3, accounts, and contract...</h3>;
        }
        return (
            <div className="App">
                {!this.state.isLogged && this.renderUIforLoggedOutUser()}
                {this.state.isLogged && this.renderUIforLoggedUser()}
            </div>
        );
    }

    renderUIforLoggedOutUser = () => {
        return (
            <div>
                {this.renderHeader()}
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
            </div>);
    };


    renderUIforLoggedUser = () => {
        return (
            <div>
                {this.renderHeader()}
                {this.renderAccountInfo()}
                <section>
                    <div>
                        <button onClick={this.getEther}>Get Ether</button>
                    </div>

                    <div>
                        <input type="text" name="fiatToBuy" placeholder="Amount in USDX"
                               onChange={this.handleFiatInputChange}/>
                        <button onClick={this.buyFiat}>Buy fiat</button>
                    </div>

                    <div>
                        <input type="text" name="stockToBuy" placeholder="Amount in USDX"
                               onChange={this.handleStockInputChange}/>
                        <button onClick={this.buyStock}>Buy stock</button>
                    </div>

                    <div>
                        <input type="text" name="fiatDeposit" placeholder="Amount in USDX"
                               onChange={this.handleDepositInputChange}/>
                        <button onClick={this.deposit}>Deposit USDX</button>
                    </div>

                    <div>
                        <input type="text" name="aaplDeposit" placeholder="Amount in shares"
                               onChange={this.handleAAPLDepositInputChange}/>
                        <button onClick={this.depositAAPL}>Deposit AAPL</button>
                    </div>
                </section>

                {this.renderTradingUI()}
            </div>
        );
    };

    renderTradingUI = () => {
        return (
            <section>
                {this.renderStockList()}
                {this.renderOrderEntry()}
                {this.renderOrderBook()}
                {this.renderOrderHistory()}
                {this.renderPortfolio()}
            </section>
        );
    };

    renderAccountInfo = () => {
        return (
            <header>
                <p>Account name: {this.state.accountName}</p>
                <p>Account address: {this.state.accountAddress}</p>
                <p>ETH: {this.state.listedAssets[0].balanceOf}</p>
                <p>USDX: {this.state.listedAssets[1].balanceOf}</p>
                <p>Deposit USDX: {this.state.depositOnDex}</p>
                <p>Deposit AAPL: {this.state.aaplDepositOnDex}</p>
                <button onClick={this.handleLoggout}>Logout</button>
            </header>
        );
    };


    renderPortfolio = () => {
        return (
            <div>
                <h3>Porfolio</h3>
                <div>
                    <table>
                        <tbody>
                        <tr>
                            <th>Symbol</th>
                            <th>Name</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                        </tbody>
                        <tbody>
                        {this.renderAssets(this.state.listedAssets)}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    renderAssets = assets => assets.map((asset, key) => this.renderAsset(asset, key));

    renderAsset = (asset, key) => {
        return (
            <tr key={key}>
                <td>{asset.name}</td>
                <td>{asset.symbol}</td>
                <td>{asset.balanceOf}</td>
                <td>{asset.price}</td>
                <td>{asset.price * asset.balanceOf}</td>
            </tr>
        );
    };

    renderOrderEntry = () => {
        const {orderEntry, lowestAsk, highestBid} = this.state;
        let lowestAskPrice = lowestAsk !== null ? lowestAsk.ask : 0;
        let highestBidPrice = highestBid !== null ? highestBid.bid : 0;
        return (
            <section>
                <p>Order entry</p>
                <div>
                    <button name="side" value="BUY" onClick={this.handleOrderEntryChange}>Buy</button>
                    <button name="side" value="SELL" onClick={this.handleOrderEntryChange}>Sell</button>
                </div>
                <p>Stock</p>
                <p>Order type</p>
                <select name="orderType" onChange={this.handleOrderEntryChange}>
                    <option name="orderTypeOption" value="Limit">Limit</option>
                    <option name="orderTypeOption" value="Market">Market</option>
                </select>
                <p>{orderEntry.side === 'BUY' ? "Ask price" : "Bid price"}</p>
                <p>{orderEntry.side === 'BUY' ? lowestAskPrice : highestBidPrice}</p>
                <p>Shares</p>
                <input name="shares" placeholder="Number of shares" onChange={this.handleOrderEntryChange}/>
                <p>Price</p>
                {orderEntry.orderType === 'Limit' && <input name="price" placeholder="USDX" onChange={this.handleOrderEntryChange}/>}
                {orderEntry.orderType === 'Market' && this.renderMarketPriceInput(lowestAskPrice, highestBidPrice)}
                <p>Estimated cost</p>
                <p>{orderEntry.totalPrice}</p>
                <button onClick={this.placeOrder}>{orderEntry.side === 'BUY' ? 'Buy' : 'Sell'}</button>
            </section>
        );
    };

    renderMarketPriceInput = (askPrice, bidPrice) => {
        const { orderEntry } = this.state;
        if (orderEntry.side === 'BUY') {
            return <input name="price" placeholder="USDX" onChange={this.handleOrderEntryChange} value={askPrice}/>
        } else {
            return <input name="price" placeholder="USDX" onChange={this.handleOrderEntryChange} value={bidPrice}/>
        }
    };

    handleOrderEntryChange = (event) => {
        const {orderEntry, highestBid, lowestAsk} = this.state;
        const name = event.target.name;
        const value = event.target.value;
        orderEntry[name] = value;
        orderEntry.totalPrice = this.calcEstimatedCost();
        if ((name === 'orderType' && value === 'Market') || (name === 'side' && orderEntry.orderType === 'Market')) {
            if (orderEntry.side === 'BUY') {
                orderEntry.price = lowestAsk.ask;
            } else {
                orderEntry.price = highestBid.bid;
            }
        }
        console.log(orderEntry);
        this.setState({orderEntry});
    };

    calcEstimatedCost = () => {
        const {orderEntry} = this.state;
        return orderEntry.shares * orderEntry.price;
    };


    renderOrderHistory = () => {
        const {orderList} = this.state;
        return (
            <section>
                <h3>Order History</h3>
                <table>
                    <tbody>
                    <tr>
                        <th>Symbol</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Time</th>
                        <th>Side</th>
                        <th>Qty</th>
                        <th>Price</th>
                    </tr>
                    </tbody>
                    <tbody>
                    {this.renderOrders(orderList)}
                    </tbody>
                </table>
            </section>
        );
    };

    renderOrders = (orders) => {
        return orders.map((order, key) => {
            return (
                <tr key={key}>
                    <td>{order.symbol}</td>
                    <td>{order.name}</td>
                    <td>{order.status}</td>
                    <td>{order.time}</td>
                    <td>{order.side}</td>
                    <td>{order.qty}</td>
                    <td>{order.price}</td>
                </tr>
            );
        });
    };

    renderHeader = () => {
        return (
            <header>
                <h1>Decentralized Stock Exchange</h1>
            </header>
        );
    };

    renderStockList = () => {
        const {stockList} = this.state;
        return (
            <section>
                <h3>Stock List</h3>
                <table>
                    <tbody>
                    <tr>
                        <th>Symbol</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Bid</th>
                        <th>Ask</th>
                    </tr>
                    </tbody>
                    <tbody>
                    {this.renderStocks(stockList)}
                    </tbody>
                </table>
            </section>
        );
    };

    renderStocks = (stocks) => {
        return stocks.map((stock, key) => {
            return (
                <tr key={key}>
                    <td>{stock.symbol}</td>
                    <td>{stock.name}</td>
                    <td>{this.state.lowestAsk.ask}</td>
                    <td>{this.state.highestBid.bid}</td>
                    <td>{this.state.lowestAsk.ask}</td>
                </tr>
            );
        });
    };

    renderOrderBook = () => {
        return (
            <section>
                <h3>Order Book AAPL/USDX</h3>
                {this.renderBidTable()}
                {this.renderAskTable()}
            </section>
        );
    };

    renderBidTable = () => {
        const {bids} = this.state;
        return (
            <table>
                <tbody>
                <tr>
                    <th>Total</th>
                    <th>Size</th>
                    <th>Bid</th>
                </tr>
                </tbody>
                <tbody>
                {this.renderBids(bids)}
                </tbody>
            </table>
        );
    };

    renderBids = (bids) => {
        return bids.map((bid, key) => {
            return (
                <tr key={key}>
                    <td>{bid.total}</td>
                    <td>{bid.size}</td>
                    <td>{bid.bid}</td>
                </tr>
            );
        });
    };

    renderAskTable = () => {
        const {asks} = this.state;
        return (
            <table>
                <tbody>
                <tr>
                    <th>Ask</th>
                    <th>Size</th>
                    <th>Total</th>
                </tr>
                </tbody>
                <tbody>
                {this.renderAsks(asks)}
                </tbody>
            </table>
        );
    };

    renderAsks = (asks) => {
        return asks.map((ask, key) => {
            return (
                <tr key={key}>
                    <td>{ask.ask}</td>
                    <td>{ask.size}</td>
                    <td>{ask.total}</td>
                </tr>
            );
        });
    };

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
        this.setState({fiatToBuy: text});
    };

    handleStockInputChange = (event) => {
        const text = event.target.value;
        this.setState({stockToBuy: text});
    };

    handleDepositInputChange = (event) => {
        const text = event.target.value;
        this.setState({fiatDeposit: text});
    };

    handleAAPLDepositInputChange = (event) => {
        const text = event.target.value;
        this.setState({aaplDeposit: text});
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
        const {accountName, accountPassword} = this.state;
        event.preventDefault();

        const accountExists = localStorage.getItem(accountName) != null;
        if (accountExists) this.login(accountName, accountPassword);
        else alert("The account " + accountName + " doesn't exists.");
    };

    login = async (name, password) => {
        const {web3} = this.state;
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
        const {web3} = this.state;
        const balance = await web3.eth.getBalance(address);
        return await web3.utils.fromWei(balance);
    };

    getUSDXBalanceOf = async address => {
        const {web3, contracts} = this.state;
        const balance = await contracts.fiat.methods.balanceOf(address).call();
        return await web3.utils.fromWei(balance);
    };

    getAAPLBalanceOf = async address => {
        const {contracts} = this.state;
        const balance = await contracts.stock.methods.balanceOf(address).call();
        return balance;
    };

    getUSDXDepositOnDex = async (address) => {
        const {web3, contracts} = this.state;
        // Should call a method of dex instead dex.methods.depositsOf(address);
        // returns a list like [ [tokenAddress, amount] ]
        try {
            const balance = await contracts.dex.methods.balanceOf(address, contracts.fiat.options.address).call();
            return web3.utils.fromWei(balance);
        } catch(error) {
            console.log(error);
            return 0;
        }
    };

    getAAPLDepositOnDex = async (address) => {
        const { contracts } = this.state;
        // Should call a method of dex instead dex.methods.depositsOf(address);
        // returns a list like [ [tokenAddress, amount] ]
        // TODO: contracts.dex.option.balanceOf(session.address, token).call();
        // this method should return the balance of the address received in params.
        // NOT the total of token owned.
        try {
            const balance = await contracts.dex.methods.balanceOf(address, contracts.stock.options.address).call();
            return balance;
        } catch(error) {
            console.log(error);
            return 0;
        }
    };

    getDepositOnDEX = async (account, token, isStock) => {
        const { contracts, web3 } = this.state;
        try {
            const balance = await contracts.dex.methods.balanceOf(account, token).call();
            if (isStock) return balance;
            else return web3.utils.fromWei(balance);
        } catch(error) {
            console.log(error);
            return 0;
        }
    };

    getEther = async () => {
        const {accounts, session, web3} = this.state;

        // Suggar account
        const suggar = {
            address: accounts[0],
            privateKey: '0x17437df3163604090b5254f80bbffeb654b76221fdeef525a2e79fc27060d0a8'.substr(2),
        };
        const to = session.address;
        const value = web3.utils.toHex(web3.utils.toWei('10', 'ether'));
        const data = '';

        await this.sendTransaction(suggar, to, value, data, true);

        this.updateBalancesOf(session.address);
    };

    buyFiat = async () => {
        const {session, contracts, fiatToBuy} = this.state;

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
        const {contracts, session, web3} = this.state;
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

    depositAAPL = async () => {
        const {contracts, session, web3, aaplDeposit} = this.state;

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
        const deposit = aaplDeposit;
        const params = [contracts.stock.options.address, deposit.toString()];
        const data = web3.eth.abi.encodeFunctionCall(jsonInterface, params);
        const value = '';

        this.sendTransaction(from, to, value, data);

        this.updateBalancesOf(session.address);
    };

    deposit = async () => {
        const {contracts, session, web3, fiatDeposit} = this.state;

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
        const deposit = fiatDeposit * 1000000000000000000;
        const params = [contracts.fiat.options.address, deposit.toString()];
        const data = web3.eth.abi.encodeFunctionCall(jsonInterface, params);
        const value = '';

        this.sendTransaction(from, to, value, data);

        this.updateBalancesOf(session.address);
    };

    placeOrder = async () => {
        const {session, contracts, web3, orderEntry} = this.state;
        // Helpers.
        const USDXToWei = n => web3.utils.toWei(n.toString(), 'ether');

        // Order data.
        let txCount, tokenMaker, tokenTaker, amountMaker, amountTaker, addressMaker, nonce;
        txCount = await web3.eth.getTransactionCount(session.address); // change to have tx of DEX
        tokenMaker = orderEntry.side === 'BUY' ? contracts.fiat.options.address : contracts.stock.options.address;
        tokenTaker = orderEntry.side === 'BUY' ? contracts.stock.options.address : contracts.fiat.options.address;
        amountMaker = orderEntry.side === 'BUY' ? USDXToWei(orderEntry.totalPrice) : orderEntry.shares;
        amountTaker = orderEntry.side === 'BUY' ? orderEntry.shares : USDXToWei(orderEntry.totalPrice);
        addressMaker = session.address;
        nonce = web3.utils.toHex(txCount);

        let orderData = {
            tokenMaker: tokenMaker,
            tokenTaker: tokenTaker,
            amountMaker: amountMaker,
            amountTaker: amountTaker,
            addressMaker: addressMaker,
            nonce: nonce,
            side: orderEntry.side,
        };

        let traderHasEnoughFundsDeposited = false;
        if (orderEntry.side === 'BUY') {
            const deposit = await this.getDepositOnDEX(orderData.addressMaker, orderData.tokenMaker, false);
            let amount = web3.utils.fromWei(orderData.amountMaker);
            if (parseFloat(deposit) >= parseFloat(amount)) {
                console.log("Trader has enough deposited.");
                traderHasEnoughFundsDeposited = true;
            } else {
                alert("You need to lock enough funds on DEX.");
            }
        } else if (orderEntry.side === 'SELL') {
            const deposit = await this.getDepositOnDEX(orderData.addressMaker, orderData.tokenMaker, true);
            let amount = orderData.amountMaker;
            if (parseFloat(deposit) >= parseFloat(amount)) {
                console.log("Trader has enough deposited.");
                traderHasEnoughFundsDeposited = true;
            } else {
                alert("You need to lock enough funds on DEX.");
            }
        }

        if (traderHasEnoughFundsDeposited && orderEntry.totalPrice > 0) {
            // Build message.
            let message = abi.soliditySHA3(
                ["address", "address", "uint256", "uint256", "address", "uint256"],
                [tokenMaker, tokenTaker, amountMaker, amountTaker, addressMaker, nonce]
            );

            // Sign message.
            let signatureObject = await this.signMessage(message, session.pk);

            // Sender order and signature to Order Book
            const params = JSON.stringify({
                orderData: orderData,
                messageHash: signatureObject.messageHash,
                signature: signatureObject.signature
            });

            try {
                const res = await axios.post('http://127.0.0.1:8000/orders', params);
                console.log(res.status);
            } catch(error) {
                console.log("Order placement failed");
                console.log(error);
            }
        } else {
            alert("You need to fill all the order entry inputs.");
        }
    };

    signMessage = async (message, privateKey) => {
        const {web3} = this.state;
        return await web3.eth.accounts.sign(
            "0x" + message.toString("hex"),
            privateKey
        );
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
        const {web3} = this.state;
        return new Promise(async function (resolve, reject) {
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
            } catch (error) {
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
        } catch (error) {
            console.log(error);
        }
        const serializedTx = tx.serialize();
        return '0x' + serializedTx.toString('hex');
    };

    sendSignedTransaction = async tx => {
        const {web3} = this.state;
        let res = await web3.eth.sendSignedTransaction(tx, (err, txHash) => {
            if (err) console.log(err);
            else console.log('txHash: ', txHash);
        });
        console.log(res);
    };
}


export default App;
