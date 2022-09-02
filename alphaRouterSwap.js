const { AlphaRouter } = require("@uniswap/smart-order-router");
const {
  Token,
  CurrencyAmount,
  TradeType,
  Percent,
} = require("@uniswap/sdk-core");
const { ethers, BigNumber } = require("ethers");
const JSBI = require("jsbi"); // jsbi@3.2.5
const V3_SWAP_ROUTER_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"; // taken from "SwapRouter02 (1.1.0)" => "https://docs.uniswap.org/protocol/reference/deployments"

require("dotenv").config();
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const WALLET_SECRET = process.env.WALLET_SECRET;
const INFURA_TEST_URL = process.env.INFURA_TEST_URL;

const web3Provider = new ethers.providers.JsonRpcProvider(INFURA_TEST_URL); // Creating instance of provider on Rinkeby Testnet

const chainId = 4;
const router = new AlphaRouter({ chainId: chainId, provider: web3Provider }); // Creating instance of `AlphaRouter`

const name0 = "Wrapped Ether";
const symbol0 = "WETH";
const decimals0 = 18;
const address0 = "0xc778417e063141139fce010982780140aa0cd5ab";

const name1 = "Uniswap Token";
const symbol1 = "UNI";
const decimals1 = 18;
const address1 = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";

const WETH = new Token(chainId, address0, decimals0, symbol0, name0); // Creating instances of `WETH`
const UNI = new Token(chainId, address1, decimals1, symbol1, name1); // Creating instances of `UNI`

const wei = ethers.utils.parseUnits("0.1", 18); // `0.01 WETH` in terms of `wei`
const inputAmount = CurrencyAmount.fromRawAmount(WETH, JSBI.BigInt(wei));

async function main() {
  // below code for `route` is taken from "https://github.com/Uniswap/smart-order-router/blob/main/src/routers/alpha-router/alpha-router.ts"
  const route = await router.route(inputAmount, UNI, TradeType.EXACT_INPUT, {
    recipient: WALLET_ADDRESS,
    slippageTolerance: new Percent(25, 100), // Creating instance of `Percent()` taking high slippage value but don't take this much high value on mainnet
    deadline: Math.floor(Date.now() / 1000 + 1800), // Math.floor(`Current time in secs` + `1800secs or 30mins)
  });

  console.log(
    `On swapping 0.1 WETH Token using above parameters we get: ${route.quote.toFixed(
      10
    )} UNI Token`
  ); // for printing the amount of `UNI`(upto 10 decimal places) that we're expecting to get out of this above `route`

  const transaction = {
    data: route.methodParameters.calldata,
    to: V3_SWAP_ROUTER_ADDRESS,
    value: BigNumber.from(route.methodParameters.value),
    from: WALLET_ADDRESS,
    gasPrice: BigNumber.from(route.gasPriceWei),
    gasLimit: ethers.utils.hexlify(1000000), // this is gas limit is very high but we can put some lower value on Mainnet
  };

  const wallet = new ethers.Wallet(WALLET_SECRET); // Creating instance of wallet
  const connectedWallet = wallet.connect(web3Provider);

  const approvalAmount = ethers.utils.parseUnits("1", 18).toString();
  const ERC20ABI = require("./abi.json");
  const contract0 = new ethers.Contract(address0, ERC20ABI, web3Provider); // Creating instance of `contract0` i.e of `WETH`
  await contract0
    .connect(connectedWallet)
    .approve(V3_SWAP_ROUTER_ADDRESS, approvalAmount);

  const tradeTransaction = await connectedWallet.sendTransaction(transaction);
}

main();
