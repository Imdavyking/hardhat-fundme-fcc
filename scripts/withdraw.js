const { getNamedAccounts, ethers } = require("hardhat");

async function main() {
  const deployer = await getNamedAccounts();
  await deployments.fixture(["all"]); // Deploy all contracts tagged as "all"
  const fundMeDeployment = await deployments.get("FundMe");
  const fundMe = await ethers.getContractAt("FundMe", fundMeDeployment.address);
  console.log("Funding Contract...");
  const transactionResponse = await fundMe.withdraw();
  await transactionResponse.wait(1);
  console.log("Got it back");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
