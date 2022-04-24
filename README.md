# terra-chain-events

An example of how we index fees.

The xAstroCW20FeeRule matches fees that have wasm logs that contain the specified attributes.

[An example UST->XDEFI swap](https://legacy.extraterrestrial.money/mainnet/tx/e9ee0836752f5f3a7dfc4e5c8a0538758b3dcc3ad4b36edd80c7334fbb77214c) - click the logs to show what we're matching on.

How to run

- install node, npm
- go to folder root, run `npm install`, then `npm start`