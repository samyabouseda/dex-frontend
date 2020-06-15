import React, { Component, useState } from "react";
import FiatCrowdsale from "./contracts/FiatCrowdsale";
import Fiat from "./contracts/Fiat";
import Stock from "./contracts/Stock";
import StockICO from "./contracts/StockICO";
import DEX from "./contracts/DEX";
import getWeb3 from "./utils/getWeb3";
import axios from "axios";
import styles from "./App.module.css";

// V2
import Dashboard from "./components/Dashboard";
import LoggedInHeader from "./components/LoggedInHeader";
import DashboardCard from "./components/DashboardCard";
import Portfolio from "./components/Portfolio";
import OrderBook from "./components/OrderBook/OrderBook";
// import InstrumentSelect from "./components/InstrumentSelect";
import OrderForm from "./components/OrderForm";
import Button from "./components/Button";
import SideBar from "./components/SideBar";
import Input from "./components/Input";
//

const abi = require("ethereumjs-abi");
const Tx = require("ethereumjs-tx").Transaction;

class App extends Component {
  state = {
    // Web3
    web3: null,
    accounts: null,

    // Accounts
    accountName: "",
    accountPassword: "",
    accountNameError: "",
    accountAddress: "",
    isLogged: false,
    session: null,

    // Assets
    listedAssets: [
      // TODO: Get the metadata dynamically.
      { name: "Ethereum", symbol: "ETH", balanceOf: 0, price: 0, total: 0 },
      { name: "US Dollar X", symbol: "USDX", balanceOf: 0, price: 0, total: 0 },
      { name: "Apple Inc.", symbol: "AAPL", balanceOf: 0, price: 0, total: 0 },
      // {name: "Microsoft Corp.", symbol: "MSFT", balanceOf: 0},
    ],

    // Trade
    fiatToBuy: 0,
    stockToBuy: 0,
    fiatDeposit: 0,
    aaplDeposit: 0,
    // TODO: Transform in trade entry.

    // Contracts
    contracts: {},

    // New UI
    stockList: [
      { symbol: "AAPL", name: "Apple Inc.", price: 0, bid: 0, ask: 0 },
      // {symbol: "MSFT", name: "Microsoft Corporation", price: 135.28, bid: 0, ask: 0},
      // {symbol: "INTC", name: "Intel Corporation", price: 46.73, bid: 0, ask: 0},
      // {symbol: "TSLA", name: "Tesla Inc.", price: 234.50, bid: 0, ask: 0},
    ],
    orders: [],
    bids: [],
    highestBid: { bid: 0, size: 0, total: 0 },
    asks: [],
    lowestAsk: { ask: 0, size: 0, total: 0 },
    orderEntry: {
      orderType: "Limit",
      tokenMaker: null, // BUY : tokenMaker = USDX, tokenTaker = STOCK     STOCK is the current selected stock
      tokenTaker: null, // SELL: tokenMaker = STOCK, tokenTaker = USDX     USDX is fiat token.
      shares: 0,
      price: 0,
      totalPrice: 0,
      side: "BUY",
    },
    assetBalances: [],

    currentPath: "",
  };

  componentDidMount = async () => {
    this.interval = setInterval(() => {
      this.loadBidAsk();
      this.loadOrders();
      this.loadBalances();
    }, 1000);
    try {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const contracts = await this.initContracts(web3);
      this.initEventWatching(contracts);
      this.initAccount(web3);
      this.loadBidAsk();
      this.setState({ web3, accounts, contracts });
    } catch (error) {
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  initContracts = async (web3) => {
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
      deployedNetwork && deployedNetwork.address
    );
  };

  initEventWatching = async (contracts) => {
    contracts.crowdsale.events.TokensPurchased({}, async (error, event) => {
      if (error) console.log(error);
      else console.log(event);
    });
  };

  initAccount = async (web3) => {
    const sessionString = localStorage.getItem("trading.session");
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
        this.setState({ lowestAsk });
      }
      if (bids.length > 0) {
        const highestBid = bids[0];
        this.setState({ highestBid });
      }
      this.setState({ bids: bids, asks: asks });
    } catch (error) {
      console.log(error);
    }
  };

  loadOrders = async () => {
    const { session } = this.state;
    try {
      if (session != null) {
        let res = await axios.get(
          "http://127.0.0.1:8000/orders?of=" + session.address
        );
        let data = res.data;

        let orders = data.map((order) => {
          return {
            symbol: "AAPL",
            name: "Apple Inc.",
            status: order.status,
            time: order.timestamp,
            side: order.side,
            qty: order.qty,
            price: order.price,
            hash: order.hash,
          };
        });
        this.setState({ orders });
      }
    } catch (error) {
      console.log(error);
    }
  };

  loadBalances = async () => {
    const { session } = this.state;
    try {
      if (session != null) {
        let res = await axios.get(
          "http://127.0.0.1:8000/accounts/assets?account=" + session.address
        );
        let assets = res.data.account.assets;
        console.log(assets);
        this.setState({ assetBalances: assets });
      }
    } catch (error) {}
  };

  updateBalancesOf = async (account) => {
    let listedAssets = this.state.listedAssets;
    // ETH
    const ethBalance = await this.getEtherBalanceOf(account);
    let ethPrice = 200;
    try {
      const ethRes = await axios.get(
        "https://api.coinmarketcap.com/v1/ticker/ethereum/"
      );
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

    this.setState({ listedAssets });
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
        <h2>Account creation</h2>
        <form onSubmit={this.createAccount}>
          <p>{this.state.accountNameError}</p>
          <input
            type="text"
            name="accountName"
            placeholder="Account name"
            onChange={this.handleAccountFormChange}
          />
          <input
            type="password"
            name="accountPassword"
            placeholder="password"
            onChange={this.handleAccountFormChange}
          />
          <button type="submit" name="createAccountButton">
            Create account
          </button>
        </form>

        <h2>Login</h2>
        <form onSubmit={this.handleLogin}>
          <input
            type="text"
            name="accountName"
            placeholder="Account name"
            onChange={this.handleAccountFormChange}
          />
          <input
            type="password"
            name="accountPassword"
            placeholder="password"
            onChange={this.handleAccountFormChange}
          />
          <button type="submit" name="loginButton">
            Login
          </button>
        </form>
      </div>
    );
  };

  createAccount = async (event) => {
    event.preventDefault();
    const { web3, accountName, accountPassword } = this.state;
    const account = web3.eth.accounts.create();
    const encryptedAccount = web3.eth.accounts.encrypt(
      account.privateKey,
      accountPassword
    );
    try {
      localStorage.setItem(accountName, JSON.stringify(encryptedAccount));
      const data = JSON.stringify({
        address: account.address,
      });
      console.log(data);
      let res = await axios.post("http://127.0.0.1:8000/accounts", data);
      if (res.status === 201) console.log("Account created successfully.");
      else if (res.status === 409) console.log("Account already exists");
    } catch (error) {
      alert("Account creation failed. Please try again.");
    }
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
    localStorage.setItem("trading.session", JSON.stringify(session));

    const ethBalance = await this.getEtherBalanceOf(session.address);
    const usdxBalance = await this.getUSDXBalanceOf(session.address);
    // Update app state
    this.setState({
      accountAddress: account.address,
      isLogged: true,
      session,
      ethBalance,
      usdxBalance,
    });
  };

  handleLoggout = () => {
    localStorage.removeItem("trading.session");
    this.setState({
      isLogged: false,
      accountName: "",
      accountAddress: "",
      session: null,
    });
  };

  renderUIforLoggedUser = () => {
    const instruments = [];
    const onSelect = () => ({});
    return (
      <div>
        <LoggedInHeader>
          {/* <InstrumentSelect instruments={instruments} onSelect={onSelect} /> */}
          {this.renderStocks(this.state.stockList)}
        </LoggedInHeader>
        <Dashboard>
          <section>
            {console.log(this.state.currentPath)}
            {this.renderOrderBook()}
            {this.renderPortfolio()}
            {this.renderOrderEntry()}
            {this.renderOrderHistory()}
            {this.renderDeposits()}
            {this.renderAccountInfo()}
            <SideBar
              currentPath={"/dashboard"}
              setCurrentPath={(currentPath) => ({})}
            />
          </section>
        </Dashboard>
      </div>
    );
  };

  renderAccountInfo = () => {
    return (
      <DashboardCard title="Profile">
        <p>Account name: {this.state.accountName}</p>
        <p>Account address: {this.state.accountAddress}</p>
        <Button color="error" onClick={this.handleLoggout}>
          Logout
        </Button>
      </DashboardCard>
    );
  };

  renderDeposits = () => {
    const { assetBalances } = this.state;
    return (
      <DashboardCard title="deposits">
        <div>
          <table>
            <tbody>
              <tr>
                <th>Symbol</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </tbody>
            <tbody>{this.renderBalances(assetBalances)}</tbody>
          </table>
        </div>
        <section>
          <input
            type="text"
            name="fiatToBuy"
            placeholder="Amount in USDX"
            onChange={this.handleFiatInputChange}
          />
          <Button color="success" onClick={this.buyFiat}>
            Purchase Fiat
          </Button>

          <div>
            {/*<p>Stock should only be sold through IPO/ICO. This if for demo purposes.</p>*/}
            <input
              type="text"
              name="stockToBuy"
              placeholder="Amount in USDX"
              onChange={this.handleStockInputChange}
            />
            <Button color="success" onClick={this.buyStock}>
              Purchase Stock
            </Button>
          </div>

          <div>
            <input
              type="text"
              name="fiatDeposit"
              placeholder="Amount in USDX"
              onChange={this.handleDepositInputChange}
            />
            <Button color="success" onClick={this.deposit}>
              Deposit USDX
            </Button>
          </div>

          <div>
            <input
              type="text"
              name="aaplDeposit"
              placeholder="Amount in shares"
              onChange={this.handleAAPLDepositInputChange}
            />
            <button onClick={this.depositAAPL}>Deposit AAPL</button>
          </div>
        </section>
      </DashboardCard>
    );
  };

  renderBalances = (assets) => {
    return assets.map((asset, key) => {
      let price = this.getAssetPrice(asset.asset.symbol);
      return (
        <tr key={key}>
          <td>{asset.asset.symbol}</td>
          <td>{asset.asset.amount}</td>
          <td>{price}</td>
          <td>{asset.asset.amount * price}</td>
        </tr>
      );
    });
  };

  getAssetPrice = (symbol) => {
    const { listedAssets } = this.state;
    let price = 0;
    listedAssets.forEach((asset) => {
      if (asset.symbol === symbol) {
        price = asset.price;
      }
    });
    return price;
  };

  renderPortfolio = () => {
    const user = {
      totalDeposited: this.state.listedAssets.reduce(
        (accumulator, { price, balanceOf }) => accumulator + price * balanceOf,
        0
      ),
      balances: this.state.listedAssets.map((asset) => ({
        ...asset,
        amount: asset.balanceOf,
      })),
    };
    return <Portfolio user={user} />;
  };

  renderOrderEntry = () => {
    const { orderEntry, lowestAsk, highestBid } = this.state;
    let lowestAskPrice = lowestAsk !== null ? lowestAsk.ask : 0;
    let highestBidPrice = highestBid !== null ? highestBid.bid : 0;
    const instrument = {
      name: "Apple Computer Inc.",
      highestAsk: lowestAskPrice,
      lowestBid: highestBidPrice,
    };
    const user = {};
    return (
      <DashboardCard title="Order Form">
        <div style={{ textAlign: "center" }}>
          <button
            name="side"
            value="BUY"
            onClick={this.handleOrderEntryChange}
            style={buttonStyle("success")}
          >
            Buy
          </button>
          <button
            name="side"
            value="SELL"
            onClick={this.handleOrderEntryChange}
            style={buttonStyle("error")}
          >
            Sell
          </button>
        </div>
        <Info
          instrument={instrument}
          marketSideIsBuy={orderEntry.side === "BUY"}
        />
        <StyledInput
          label="Number of shares"
          name="shares"
          placeholder="100"
          onChange={this.handleOrderEntryChange}
          type="text"
        />
        {orderEntry.orderType === "Limit" && (
          <StyledInput
            label="Price per share"
            name="price-pre-share"
            placeholder="USDX"
            type="text"
            onChange={this.handleOrderEntryChange}
          />
        )}

        <StyledInput
          label="Total price"
          name="total-price"
          placeholder=""
          type="text"
          readOnly={true}
          value={orderEntry.totalPrice}
        />

        <button
          onClick={this.placeOrder}
          style={buttonStyle(orderEntry.side === "BUY" ? "success" : "error")}
        >
          {orderEntry.side === "BUY" ? "Buy Assets" : "Sell Assets"}
        </button>
      </DashboardCard>
    );
  };

  renderMarketPriceInput = (askPrice, bidPrice) => {
    const { orderEntry } = this.state;
    if (orderEntry.side === "BUY") {
      return (
        <input
          name="price"
          placeholder="USDX"
          onChange={this.handleOrderEntryChange}
          value={askPrice}
        />
      );
    } else {
      return (
        <input
          name="price"
          placeholder="USDX"
          onChange={this.handleOrderEntryChange}
          value={bidPrice}
        />
      );
    }
  };

  handleOrderEntryChange = (event) => {
    const { orderEntry, highestBid, lowestAsk } = this.state;
    const name = event.target.name;
    const value = event.target.value;
    console.log(value);
    orderEntry[name] = value;
    orderEntry.totalPrice = this.calcEstimatedCost();
    if (
      (name === "orderType" && value === "Market") ||
      (name === "side" && orderEntry.orderType === "Market")
    ) {
      if (orderEntry.side === "BUY") {
        orderEntry.price = lowestAsk.ask;
      } else {
        orderEntry.price = highestBid.bid;
      }
    }
    // console.log(orderEntry);
    this.setState({ orderEntry });
  };

  calcEstimatedCost = () => {
    const { orderEntry } = this.state;
    return orderEntry.shares * orderEntry.price;
  };

  renderOrderHistory = () => {
    const { orders } = this.state;
    return (
      <DashboardCard title="Order history">
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
          <tbody>{this.renderOrders(orders)}</tbody>
        </table>
      </DashboardCard>
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
          <td>
            {order.status !== "FILLED" && (
              <button value={order.hash} onClick={this.handleCancelClick}>
                Cancel
              </button>
            )}
          </td>
        </tr>
      );
    });
  };

  handleCancelClick = async (event) => {
    const orderHash = event.target.value;
    try {
      let res = await axios.delete(
        "http://127.0.0.1:8000/orders?hash=" + orderHash
      );
      if (res.status === "204") {
        console.log("Successfully cancelled");
      }
    } catch (error) {
      console.log(error);
    }
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
    const bids = this.state.bids.map((bid) => ({
      ...bid,
      volume: bid.size,
      limitPrice: bid.bid,
    }));
    const asks = this.state.asks.map((ask) => ({
      ...ask,
      volume: ask.size,
      limitPrice: ask.ask,
    }));
    const highestAsk = this.state.highestBid;
    const lowestBid = this.state.lowestAsk;
    return (
      <OrderBook
        bids={bids}
        asks={asks}
        highestAsk={highestAsk}
        lowestBid={lowestBid}
      />
    );
  };

  renderBidTable = () => {
    const { bids } = this.state;
    return (
      <table>
        <tbody>
          <tr>
            <th>Total</th>
            <th>Size</th>
            <th>Bid</th>
          </tr>
        </tbody>
        <tbody>{this.renderBids(bids)}</tbody>
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
    const { asks } = this.state;
    return (
      <table>
        <tbody>
          <tr>
            <th>Ask</th>
            <th>Size</th>
            <th>Total</th>
          </tr>
        </tbody>
        <tbody>{this.renderAsks(asks)}</tbody>
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
    this.setState({ [name]: text });
    if (name === "accountName") {
      if (localStorage.getItem(text) != null) {
        this.setState({
          accountNameError:
            "Account with the name " + text + " already exists.",
        });
      } else {
        this.setState({ accountNameError: "" });
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

  handleDepositInputChange = (event) => {
    const text = event.target.value;
    this.setState({ fiatDeposit: text });
  };

  handleAAPLDepositInputChange = (event) => {
    const text = event.target.value;
    this.setState({ aaplDeposit: text });
  };

  getEtherBalanceOf = async (address) => {
    const { web3 } = this.state;
    const balance = await web3.eth.getBalance(address);
    return await web3.utils.fromWei(balance);
  };

  getUSDXBalanceOf = async (address) => {
    const { web3, contracts } = this.state;
    const balance = await contracts.fiat.methods.balanceOf(address).call();
    return await web3.utils.fromWei(balance);
  };

  getAAPLBalanceOf = async (address) => {
    const { contracts } = this.state;
    const balance = await contracts.stock.methods.balanceOf(address).call();
    return balance;
  };

  getDepositOnDEX = async (account, token, isStock) => {
    const { assetBalances } = this.state;
    let balance = 0;
    assetBalances.forEach((asset) => {
      if (asset.asset.address === token.toString()) {
        balance = asset.asset.amount;
      }
    });
    return balance;
  };

  getEther = async () => {
    const { accounts, session, web3 } = this.state;

    // Suggar account
    const suggar = {
      address: accounts[0],
      privateKey: "0x17437df3163604090b5254f80bbffeb654b76221fdeef525a2e79fc27060d0a8".substr(
        2
      ),
    };
    const to = session.address;
    const value = web3.utils.toHex(web3.utils.toWei("10", "ether"));
    const data = "";

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
    const value = (fiatToBuy / rate) * 1000000000000000000;

    await this.sendTransaction(from, to, value, "");

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
      name: "buyStock",
      type: "function",
      inputs: [
        {
          type: "uint256",
          name: "_fiatAmount",
        },
      ],
    };
    const parameters = [this.state.stockToBuy];
    const data = web3.eth.abi.encodeFunctionCall(jsonInterface, parameters);
    const value = "";

    this.sendTransaction(from, to, value, data);

    this.updateBalancesOf(session.address);
  };

  depositAAPL = async () => {
    const { contracts, session, web3, aaplDeposit } = this.state;

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
      name: "deposit",
      type: "function",
      inputs: [
        {
          type: "address",
          name: "token",
        },
        {
          type: "uint256",
          name: "amount",
        },
      ],
    };
    const deposit = aaplDeposit;
    const params = [contracts.stock.options.address, deposit.toString()];
    const data = web3.eth.abi.encodeFunctionCall(jsonInterface, params);
    const value = "";

    try {
      const json = JSON.stringify({
        account_address: session.address,
        asset: {
          symbol: "AAPL",
          address: contracts.stock.options.address,
          amount: parseFloat(deposit),
        },
      });
      let res = await axios.post("http://127.0.0.1:8000/accounts/assets", json);
      console.log(res.status);
      if (res.status === 201) {
        console.log("Deposit recorded successfully on backend.");

        this.sendTransaction(from, to, value, data);

        this.updateBalancesOf(session.address);
      }
    } catch (error) {
      alert("Deposit failed, please try again.");
    }
  };

  deposit = async () => {
    const { contracts, session, web3, fiatDeposit } = this.state;

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
      name: "deposit",
      type: "function",
      inputs: [
        {
          type: "address",
          name: "token",
        },
        {
          type: "uint256",
          name: "amount",
        },
      ],
    };
    const deposit = (fiatDeposit * 1000).toString() + "000000000000000";
    console.log(deposit);
    const params = [contracts.fiat.options.address, deposit];
    const data = web3.eth.abi.encodeFunctionCall(jsonInterface, params);
    const value = "";

    try {
      const json = JSON.stringify({
        account_address: session.address,
        asset: {
          symbol: "USDX",
          address: contracts.fiat.options.address,
          amount: parseFloat(fiatDeposit),
        },
      });
      let res = await axios.post("http://127.0.0.1:8000/accounts/assets", json);
      console.log(res.status);
      if (res.status === 201) {
        console.log("Deposit recorded successfully on backend.");

        this.sendTransaction(from, to, value, data);

        this.updateBalancesOf(session.address);
      }
    } catch (error) {
      alert("Deposit failed, please try again.");
    }
  };

  placeOrder = async () => {
    const { session, contracts, web3, orderEntry } = this.state;
    // Helpers.
    const USDXToWei = (n) => web3.utils.toWei(n.toString(), "ether");

    // Order data.
    let txCount,
      tokenMaker,
      tokenTaker,
      amountMaker,
      amountTaker,
      addressMaker,
      nonce;
    txCount = await web3.eth.getTransactionCount(session.address); // change to have tx of DEX
    tokenMaker =
      orderEntry.side === "BUY"
        ? contracts.fiat.options.address
        : contracts.stock.options.address;
    tokenTaker =
      orderEntry.side === "BUY"
        ? contracts.stock.options.address
        : contracts.fiat.options.address;
    amountMaker =
      orderEntry.side === "BUY"
        ? USDXToWei(orderEntry.totalPrice)
        : orderEntry.shares;
    amountTaker =
      orderEntry.side === "BUY"
        ? orderEntry.shares
        : USDXToWei(orderEntry.totalPrice);
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
    if (orderEntry.side === "BUY") {
      const deposit = await this.getDepositOnDEX(
        orderData.addressMaker,
        orderData.tokenMaker,
        false
      );
      let amount = web3.utils.fromWei(orderData.amountMaker);
      if (parseFloat(deposit) >= parseFloat(amount)) {
        console.log("Trader has enough deposited.");
        traderHasEnoughFundsDeposited = true;
      } else {
        alert("You need to lock enough funds on DEX.");
      }
    } else if (orderEntry.side === "SELL") {
      const deposit = await this.getDepositOnDEX(
        orderData.addressMaker,
        orderData.tokenMaker,
        true
      );
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
        signature: signatureObject.signature,
      });

      try {
        const res = await axios.post("http://127.0.0.1:8000/orders", params);
        console.log(res.status);
      } catch (error) {
        console.log("Order placement failed");
        console.log(error);
      }
    } else {
      console.log(orderEntry);
      alert("You need to fill all the order entry inputs.");
    }
  };

  signMessage = async (message, privateKey) => {
    const { web3 } = this.state;
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
          gasPrice: web3.utils.toHex(web3.utils.toWei("10", "gwei")),
        };
        resolve(txObject);
      } catch (error) {
        reject(error);
      }
    });
  };

  signTransaction = (txData, privateKey) => {
    const bufferedPk = Buffer.from(privateKey, "hex");
    let tx;
    try {
      tx = new Tx(txData);
      tx.sign(bufferedPk);
    } catch (error) {
      console.log(error);
    }
    const serializedTx = tx.serialize();
    return "0x" + serializedTx.toString("hex");
  };

  sendSignedTransaction = async (tx) => {
    const { web3 } = this.state;
    let res = await web3.eth.sendSignedTransaction(tx, (err, txHash) => {
      if (err) console.log(err);
      else console.log("txHash: ", txHash);
    });
    console.log(res);
  };
}

const buttonStyle = (color) => ({
  color: "#ffffff",
  backgroundColor: color === "success" ? "#60CF8C" : "#C34A3E",
  borderRadius: "6px",
  border: "none",
  padding: "0.8em 4.25em",
  fontSize: "14px",
  fontWeight: 900,
  letterSpacing: "0.54px",
  lineHeight: "19px",
  textAlign: "center",
  margin: "1em",
  cursor: "pointer",
});

const Info = ({ instrument, marketSideIsBuy }) => (
  <div className={styles.info}>
    <div>
      <p className={styles.title}>{instrument.name}</p>
      <p className={styles["sub-title"]}>Selected asset</p>
    </div>
    <div>
      <p className={styles.title}>
        ${marketSideIsBuy ? instrument.highestAsk : instrument.lowestBid}
      </p>
      <p className={styles["sub-title"]}>Price per share</p>
    </div>
  </div>
);

class StyledInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.value,
    };

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(e) {
    this.setState({ value: e.target.value });
    const { onChange } = this.props;
    if (onChange) onChange(e);
  }

  render() {
    const { name, label, readOnly = false, placeholder, type } = this.props;
    return (
      <fieldset className={styles.fieldset}>
        <label className={styles.label} htmlFor={name}>
          {label}
        </label>
        <input
          readOnly={readOnly}
          name={name}
          type={type}
          value={this.state.value}
          placeholder={placeholder}
          className={styles.input}
          onChange={this.handleChange}
        />
      </fieldset>
    );
  }
}

export default App;
