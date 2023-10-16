const {network, getNamedAccounts, deployments, ethers} = require("hardhat")
// const {anyValue} = require("@nomicfoundation/hardhat-chai-matchers/withArgs") // if we are supposed to use *anyVlaue* in *withArgs*
const {assert, expect} = require("chai")
const {
    developmentchains,
    networkconfig,
} = require("../../helper-hardhat-config")

!developmentchains.includes(network.name)
    ? describe.skip
    : describe("Raffle Uint Test", () => {
          let raffle,
              vrfCoordinatorV2Mock,
              raffleEntranceFee,
              deployer,
              interval
          const chainId = network.config.chainId
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle")
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
              )
          })
          describe("constructor", () => {
              it("initializes the raffle correctly", async () => {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(
                      interval.toString(),
                      networkconfig[chainId]["interval"],
                  )
              })
          })
          describe("enterRaffle", () => {
              it("reverts when you dont pay enough", async () => {
                  await expect(
                      raffle.EnterRaffle(),
                  ).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughtETHEntered",
                  )
              })
              it("records players when they enter", async () => {
                  await raffle.EnterRaffle({value: raffleEntranceFee})
                  const playerfromcontract = await raffle.getPLayer(0)
                  assert.equal(playerfromcontract, deployer)
              })
              it("emits event on enter", async () => {
                  await expect(
                      raffle.EnterRaffle({value: raffleEntranceFee}),
                  ).to.emit(raffle, "RaffleEnter")
              })
              it("doesnt allow entrance when raffle is on calculaiting state", async () => {
                  await raffle.EnterRaffle({value: raffleEntranceFee})
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ])
                  //   await network.provider.request({
                  //       method: "evm_increaseTime",
                  //       params: [Number(interval) + 1],
                  //   })
                  await network.provider.send("evm_mine", [])
                  //   await network.provider.request({
                  //       method: "evm_mine",
                  //       params: [],
                  //   })
                  await raffle.performUpkeep("0x")
                  await expect(
                      raffle.EnterRaffle({value: raffleEntranceFee}),
                  ).to.be.revertedWithCustomError(raffle, "Raffle__notOpen")
              })
          })
          describe("checkUpkeep", () => {
              it("returns false if people havent sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ])
                  await network.provider.send("evm_mine", [])
                  const {upkeepNeeded} = await raffle.checkUpkeep("0x")
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isnt open", async () => {
                  await raffle.EnterRaffle({value: raffleEntranceFee})
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep("0x")
                  const raffleState = await raffle.getRaffleState()
                  const {upkeepNeeded} = await raffle.checkUpkeep("0x")
                  assert.equal(raffleState.toString(), "1")
                  assert(!upkeepNeeded)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.EnterRaffle({value: raffleEntranceFee})
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) - 4,
                  ]) // use a higher number here if this test fails
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const {upkeepNeeded} = await raffle.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.EnterRaffle({value: raffleEntranceFee})
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const {upkeepNeeded} = await raffle.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded)
              })
          })
          describe("performUpkeep", () => {
              it("can only run if checkupkeep is true", async () => {
                  await raffle.EnterRaffle({value: raffleEntranceFee})
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const tx = await raffle.performUpkeep("0x")
                  //   console.log(tx)
                  assert(tx)
              })
              it("reverts if checkup is false", async () => {
                  const numOfplayers = Number(await raffle.getNumberOfPlayers())
                  const raffleState = Number(await raffle.getRaffleState())
                  const balance = Number(
                      await ethers.provider.getBalance(
                          await raffle.getAddress(),
                      ),
                  )
                  /* first way to be more specific with args of customEroor */
                  //   console.log(numOfplayers, raffleState, balance)
                  //   await expect(
                  //       raffle.performUpkeep("0x"),
                  //   ).to.be.revertedWithCustomError(
                  //       raffle,
                  //       "Raffle__UpkeepNotNeeded",
                  //       [balance, numOfplayers, raffleState],
                  //   )
                  /*---------------------------------------------------------*/
                  /* second way to be more specific with args of customEroor */
                  await expect(raffle.performUpkeep("0x"))
                      .to.be.revertedWithCustomError(
                          raffle,
                          "Raffle__UpkeepNotNeeded",
                          // [balance, numOfplayers, raffleState],
                      )
                      //.withArgs(anyValue, anyValue, anyValue)
                      .withArgs(balance, numOfplayers, raffleState)
              })
              it("updates the raffle state, emit an event and call the requestRandomWords func from vrf coordinator", async () => {
                  await raffle.EnterRaffle({value: raffleEntranceFee})
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  })
                  const tx_res = await raffle.performUpkeep("0x")
                  const tx_receipt = await tx_res.wait(1)
                  const reqId = tx_receipt.logs[1].args.reqId
                  const raffleState = await raffle.getRaffleState()
                  //   assert(Number(reqId) === 1) /* its right since we actually call one time here in this test */
                  assert(Number(reqId) > 0)
                  assert(Number(raffleState) === 1)
              })
          })
          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await raffle.EnterRaffle({value: raffleEntranceFee})
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ])
                  await network.provider.send("evm_mine", [])
              })
              it("can only be called after performupkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(
                          0,
                          await raffle.getAddress(),
                      ),
                  ).to.be.revertedWith("nonexistent request")
              })

              it("calling fulfillRandomWords func from vrfCoordinatorV2Mock results in emitting the WinnerPicked event from raffle", async () => {
                  const tx = await raffle.performUpkeep("0x")
                  const tx_receipt = await tx.wait(1)
                  const reqId = tx_receipt.logs[1].args.reqId
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(
                          reqId,
                          await raffle.getAddress(),
                      ),
                  ).to.emit(raffle, "WinnerPicked")
              })
              it("picks the winner,resets the lottery,and sends money", async () => {
                  const additionalentrants = 3
                  const startingindex = 1
                  const accounts = await ethers.getSigners()
                  let startingBalance
                  for (
                      let i = startingindex;
                      i < startingindex + additionalentrants;
                      i++
                  ) {
                      const accountsconnectedRaffle = await raffle.connect(
                          accounts[i],
                      )
                      await accountsconnectedRaffle.EnterRaffle({
                          value: raffleEntranceFee,
                      })
                  }
                  const startingTimeStamp = await raffle.getLastTimeStamp()
                  await new Promise(async (res, rej) => {
                      console.log("WinnerPicked event fired!!!")
                      raffle.once("WinnerPicked", async () => {
                          try {
                              const recentwinner =
                                  await raffle.getRecentWinner()
                              //   console.log(recentwinner)
                              //   console.log("---------------")
                              //   console.log(accounts[0].address)
                              //   console.log(accounts[1].address)
                              //   console.log(accounts[2].address)
                              //   console.log(accounts[3].address)
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp =
                                  await raffle.getLastTimeStamp()
                              const numPlayers =
                                  await raffle.getNumberOfPlayers()
                              const winnerBalance =
                                  await ethers.provider.getBalance(
                                      accounts[1].address,
                                  )
                              assert.equal(
                                  Number(winnerBalance),
                                  // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                  Number(startingBalance) +
                                      Number(raffleEntranceFee) *
                                          Number(additionalentrants) +
                                      Number(raffleEntranceFee),
                              )
                              //   assert.equal(
                              //       winnerBalance.toString(),
                              //       // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                              //       (
                              //           Number(startingBalance) +
                              //           Number(raffleEntranceFee) *
                              //               additionalentrants +
                              //           Number(raffleEntranceFee)
                              //       ).toString(),
                              //   )
                              await expect(raffle.getPLayer(0)).to.be.reverted
                              assert.equal(recentwinner, accounts[1].address)
                              assert.equal(Number(numPlayers), 0)
                              assert.equal(Number(raffleState), 0)
                              assert(endingTimeStamp > startingTimeStamp) // we are better off set up this way Number(endingTimeStamp) > Number(startingTimeStamp) but the former still works
                              res()
                          } catch (e) {
                              rej(e)
                          }
                      })
                      try {
                          const tx = await raffle.performUpkeep("0x")
                          const txReceipt = await tx.wait(1)
                          startingBalance = await ethers.provider.getBalance(
                              accounts[1].address,
                          )
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              txReceipt.logs[1].args.reqId, // if we set Number(txReceipt.logs[1].args.reqId) it will be alright
                              await raffle.getAddress(),
                          )
                      } catch (e) {
                          console.log(e)
                      }
                  })
              })
          })
      })
