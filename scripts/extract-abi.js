const fs = require('fs');

const artifact = require('../artifacts/contracts/PredictExExchange.sol/PredictExExchange.json');
const abi = JSON.stringify(artifact.abi, null, 2);

fs.writeFileSync('lib/contracts/PredictExExchange.abi.json', abi);

console.log('✅ ABI extracted to lib/contracts/PredictExExchange.abi.json');