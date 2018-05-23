# DataBright model market backend

## Prerequisits
- `Cargo` and `rust` installed
- A running ethereum node with websocket support and an unlocked account
  - i.e. using geth: `geth --networkid=4 --datadir=$HOME/.rinkeby --syncmode=light --rinkeby --rpc --rpcport "8545" --rpcapi "personal,db,eth,net,web3" --ws --wsport "8546" --wsaddr "127.0.0.1" --wsapi "personal,db,eth,net,web3" --wsorigins "*" --unlock="<my_accountaddress>" --password <(echo "<my_accountpassword>")`

## How to run
1. In `data_market` directory, run `truffle compile`
2. In `data_market/scripts` directory, run `python3 ./extract_abi.py`
3. Use `model_market/config.ini` to configure the backend
3. In `model_market` directory, run `cargo run`
