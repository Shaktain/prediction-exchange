const hre = require("hardhat");

async function main() {
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia testnet USDC
  
  console.log("Deploying PredictionVault...");
  
  const PredictionVault = await hre.ethers.getContractFactory("PredictionVault");
  const vault = await PredictionVault.deploy(usdcAddress);
  
  await vault.waitForDeployment();
  
  const address = await vault.getAddress();
  console.log("PredictionVault deployed to:", address);
  console.log("USDC address:", usdcAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});