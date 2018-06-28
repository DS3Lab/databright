# DataBright data market

## Prerequisits
- A locally running ipfs daemon with the ipfs API running on `localhost:5001` and ipfs gateway at `http://localhost:8080/`
-- This may be changed in `marketplaces/src/js/common.js`.
- A wallet application or wallet extension for your webbrowser (tested with Chrome and MetaMask)

## How to run

1. In `marketplaces` directory, run `truffle compile`
2. In `marketplaces/scripts` directory, run `python3 ./extract_abi.py`
3. In `marketplaces` directory, run `npm run dev`
4. Open `localhost:3000` in your webrowser

## Current deployment on Rinkeby Testnet:
DatabaseAssociation address: `0x40fc6523ac8b79de17c2968a7ea30da9f8a95173`
ModelMarket address: `0xb2b20f08e9a93b507d855f1e058f477dc9d5b061`
