const {assert, expect} = require("chai")
const {getNamedAccounts, ethers, network} = require("hardhat")
const {developmentchains} = require("../../helper-hardhat-config")
developmentchains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle")
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  // enter the raffle
                  console.log("Setting up test...")
                  const startingTimeStamp = await raffle.getLastTimeStamp()
                  //   const accounts = await ethers.getSigners()

                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter the raffle
                      // Just in case the blockchain moves REALLY fast
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              // add our asserts here
                              const recentWinner =
                                  await raffle.getRecentWinner()

                              const raffleState = await raffle.getRaffleState()

                              const winnerEndingBalance =
                                  await ethers.provider.getBalance(deployer)

                              const endingTimeStamp =
                                  await raffle.getLastTimeStamp()

                              await expect(raffle.getPLayer(0)).to.be.reverted
                              assert.equal(
                                  recentWinner.toString(),
                                  deployer, //accounts[0].address,
                              )

                              assert.equal(raffleState.toString(), 0)

                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  (
                                      winnerStartingBalance + raffleEntranceFee
                                  ).toString(),
                              )

                              assert(endingTimeStamp > startingTimeStamp)

                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      // Then entering the raffle
                      console.log("Entering Raffle...")
                      const tx = await raffle.EnterRaffle({
                          value: raffleEntranceFee,
                      })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance =
                          await ethers.provider.getBalance(deployer)

                      //   await accounts[0].getBalance()

                      // and this code WONT complete until our listener has finished listening!
                  })
              })
          })
      })

// get yuor subId for chainlinkvrf
// deploy our contract using subId
// register the contract with chainlinkvrf & its subId
// register the contract with chainlink keeper
// running staging test
