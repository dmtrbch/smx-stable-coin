let StableCoin = artifacts.require("./StableCoin.sol");
let DepositorCoin = artifacts.require("./DepositorCoin.sol");
let Oracle = artifacts.require("./Oracle.sol");
let { catchRevert } = require("./exceptionsHelper.js")

contract("StableCoin", function() {
  let ethUsdPrice, feeRatePercentage;

  let oracleInstance;
  let stableCoinInstance;

  describe("My Stable Coin Contract", () => {
    beforeEach(async () => {
      feeRatePercentage = 3;
      ethUsdPrice = 4000;

      oracleInstance = await Oracle.new();
      await oracleInstance.setPrice(ethUsdPrice);

      stableCoinInstance = await StableCoin.new(
        feeRatePercentage,
        oracleInstance.address
      );
    })

    describe("Stable Coin Deployment Specifications", () => {
      it("Should set fee rate percentage", async () => {
        const result = await stableCoinInstance.feeRatePercentage();

        assert.equal(
          result,
          feeRatePercentage,
          oracleInstance.address
        )
      })

      it("Should allow minting", async () => {
        const ethAmount = 1;
        const expectedMintAmount = ethAmount * ethUsdPrice;

        await stableCoinInstance.mint({
          value: web3.utils.toWei(String(ethAmount), 'ether')
        })

        const result = await stableCoinInstance.totalSupply();
        assert.equal(
          String(result),
          web3.utils.toWei(String(expectedMintAmount), 'ether'),
          "there is some issue"
        )
      })

      describe("With minted tokens", () => {
        let mintAmount;

        beforeEach(async () => {
          /*
            TODO: calculate mint amount, (mint amount) = (1 eth) * (ethereum In usd Price)
            TODO: Call Stable Coin's contract mint function with 1 eth as value 
            ======= THIS IS DONE =======
          */
          const ethAmount = 1;
          mintAmount = ethAmount * ethUsdPrice

          await stableCoinInstance.mint({
            value: web3.utils.toWei(String(ethAmount), 'ether')
          })
        })

        it("Should allow burning", async () => {
          const remainingStableCoinAmount = 100;
          /*
            TODO: Call Stable Coin's contract burn function
            TODO: Assign Stable Coin's contract totalSupply to result constant
            TODO: Create assertion (asser equal), compare result, with toWei(remainingStableCoinAmount)
           */
          await stableCoinInstance.burn(
            web3.utils.toWei(String(mintAmount - remainingStableCoinAmount), 'ether')
          )
 
          const result = await stableCoinInstance.totalSupply();

          assert.equal(
            String(result),
            web3.utils.toWei(String(remainingStableCoinAmount), 'ether'),
            "there is some issue"
          )
        })

        it("Should prevent depositing collateral buffer below minimum", async () => {
          const stableCoinCollateralBuffer = 0.05; // less than minimum, minimum is 0.1 (10% from 1 ether)

          await catchRevert(stableCoinInstance.depositCollateralBuffer({
            value: web3.utils.toWei(String(stableCoinCollateralBuffer), 'ether')
          }))
        })

        it("Should allow depositing collaterl buffer", async () => {
          const stableCoinCollateralBuffer = 0.5;

          await stableCoinInstance.depositCollateralBuffer({
            value: web3.utils.toWei(String(stableCoinCollateralBuffer), 'ether')
          })

          let depositorCoinAddress = await stableCoinInstance.getDepositorContractAddress();

          let depostiorCoinInstance = await DepositorCoin.at(String(depositorCoinAddress))

          const newInitialSurplusInUsd = stableCoinCollateralBuffer * ethUsdPrice

          const result = await depostiorCoinInstance.totalSupply();

          assert.equal(
            String(result),
            web3.utils.toWei(String(newInitialSurplusInUsd), 'ether'),
            "there is some issue"
          )
        })

        describe("With deposited collateral buffer", () => {

          /*
            TODO: beforeEach - figure out how to deposit collateral buffer
          */
          let stableCoinCollateralBuffer;

          beforeEach(async () => {
            stableCoinCollateralBuffer = 0.5;

            await stableCoinInstance.depositCollateralBuffer({
              value: web3.utils.toWei(String(stableCoinCollateralBuffer), 'ether')
            })
          })

          it("Should allow withdrawing collateral buffer", async () => {
            /*
              TODO 
            */
            
            const newDepositorTottalSupply = stableCoinCollateralBuffer * ethUsdPrice;

            const stableCoinCollaterBurnAmount = newDepositorTottalSupply * 0.2;

            let depositorCoinAddress = await stableCoinInstance.getDepositorContractAddress();

            let depostiorCoinInstance = await DepositorCoin.at(String(depositorCoinAddress));

            await stableCoinInstance.withdrawCollateralBuffer(
              web3.utils.toWei(String(stableCoinCollaterBurnAmount), 'ether')
            )

            const result = await depostiorCoinInstance.totalSupply();

            assert.equal(
              String(result),
              web3.utils.toWei(String(newDepositorTottalSupply - stableCoinCollaterBurnAmount), 'ether'),
              "there is some issue"
            )
          })
        })
      })
    })
  })
})
