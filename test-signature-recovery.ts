import { recoverMessageAddress, hashTypedData } from 'viem';

const domain = {
  name: 'PredictEx',
  version: '1',
  chainId: 84532,
  verifyingContract: '0xD92E9A787b825D0Dde9968782F7b129539263668' as `0x${string}`
};

const types = {
  Order: [
    { name: 'marketId', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'direction', type: 'uint8' },
    { name: 'price', type: 'uint256' },
    { name: 'quantity', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ]
};

const message = {
  marketId: 7n,
  side: 0,
  direction: 0,
  price: 250000n,
  quantity: 1000000n,
  expiration: 1765971502n,
  nonce: 1765885102247n
};

const signature = '0x1858801108f21403f76dde0902976f8027e536ef5b404524298ced43d11d50234f485a31b318dda4e7fed40473d4eeafe57fd4edb56ab1844b164799ab2455df1b' as `0x${string}`;

async function recover() {
  const hash = hashTypedData({
    domain,
    types,
    primaryType: 'Order',
    message
  });
  
  console.log('Message hash:', hash);
  
  const recoveredAddress = await recoverMessageAddress({
    message: { raw: hash },
    signature
  });
  
  console.log('Recovered address:', recoveredAddress);
  console.log('Expected (Wallet 1):', '0x6cfC6D4b0fEa11D74732532c82AfE0611eA0D0E1');
  console.log('Match:', recoveredAddress.toLowerCase() === '0x6cfC6D4b0fEa11D74732532c82AfE0611eA0D0E1'.toLowerCase());
}

recover().catch(console.error);