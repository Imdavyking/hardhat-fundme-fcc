const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe;
      let mockV3Aggregator;
      let deployer;
      const sendValue = ethers.parseEther("1"); // 1 ETH

      beforeEach(async function () {
        // Deploy our FundMe contract
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]); // Deploy all contracts tagged as "all"
        const fundMeDeployment = await deployments.get("FundMe");
        fundMe = await ethers.getContractAt("FundMe", fundMeDeployment.address);
        const mockV3AggregatorDeployment = await deployments.get(
          "MockV3Aggregator"
        );
        mockV3Aggregator = await ethers.getContractAt(
          "MockV3Aggregator",
          mockV3AggregatorDeployment.address
        );
      });

      describe("constructor", async function () {
        it("sets the aggregator address correctly", async function () {
          const response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.target);
        });
      });

      describe("fund", async function () {
        it("fail if you don't send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });
        it("update the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue });

          const response = await fundMe.getAddressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });

        it("add funder to array of funders", async function () {
          await fundMe.fund({ value: sendValue });

          const response = await fundMe.getFunder(0);
          assert.equal(response, deployer);
        });
      });

      describe("withdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });

        it("withdraw ETH from a single funder", async function () {
          // Arrange
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          const startingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );

          // Act
          const transactionResponse = await fundMe.withdraw();
          const { gasUsed, gasPrice } = await transactionResponse.wait();

          const gasCost = gasUsed * gasPrice;

          const endingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(
            endingFundMeBalance.toString(),
            "0",
            "FundMe contract balance should be 0"
          );
          assert.equal(
            startingFundMeBalance + startingDeployerBalance,
            endingDeployerBalance + gasCost
          );
        });

        it("withdraw ETH from a single funder cheaper", async function () {
          // Arrange
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          const startingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );

          // Act
          const transactionResponse = await fundMe.cheaperWithdraw();
          const { gasUsed, gasPrice } = await transactionResponse.wait();

          const gasCost = gasUsed * gasPrice;

          const endingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(
            endingFundMeBalance.toString(),
            "0",
            "FundMe contract balance should be 0"
          );
          assert.equal(
            startingFundMeBalance + startingDeployerBalance,
            endingDeployerBalance + gasCost
          );
        });

        it("allows us to withdraw with multiple funders", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 0; i < 6; i++) {
            await fundMe.connect(accounts[i]).fund({ value: sendValue });
          }
          // Arrange
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          const startingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );
          // Act
          const transactionResponse = await fundMe.withdraw();
          const { gasUsed, gasPrice } = await transactionResponse.wait();

          const gasCost = gasUsed * gasPrice;

          const endingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );

          // Assert
          assert.equal(
            endingFundMeBalance.toString(),
            "0",
            "FundMe contract balance should be 0"
          );

          // Make sure the funders are reset properly
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (i = 0; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("Only allow the owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = fundMe.connect(attacker);

          await expect(
            attackerConnectedContract.withdraw()
          ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
        });

        it("cheaper withdraw...", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 0; i < 6; i++) {
            await fundMe.connect(accounts[i]).fund({ value: sendValue });
          }
          // Arrange
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          const startingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );
          // Act
          const transactionResponse = await fundMe.cheaperWithdraw();
          const { gasUsed, gasPrice } = await transactionResponse.wait();

          const gasCost = gasUsed * gasPrice;

          const endingFundMeBalance = await ethers.provider.getBalance(
            fundMe.target
          );

          // Assert
          assert.equal(
            endingFundMeBalance.toString(),
            "0",
            "FundMe contract balance should be 0"
          );

          // Make sure the funders are reset properly
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (i = 0; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
      });
    });
