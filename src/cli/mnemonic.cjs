const { ethers } = require("ethers");
const mnemonic = ethers.Mnemonic.entropyToPhrase(ethers.randomBytes(16))
console.log(mnemonic);