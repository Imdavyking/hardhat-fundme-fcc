// import
// main function
// calling of main function

const {
  networkConfig,
  developmentChains,
  DECIMALS,
  INITIAL_ANSWER,
} = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  if (developmentChains.includes(network.name)) {
    log("Local network detected, deploying mock");
    await deploy("MockV3Aggregator", {
      from: deployer,
      log: true,
      contract: "MockV3Aggregator",
      args: [DECIMALS, INITIAL_ANSWER],
    });
    log("Mocks deployed");
    log("----------------------------");
  }
};

module.exports.tags = ["all", "mocks"];
