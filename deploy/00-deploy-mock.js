// npx hardhat deploy --tags mocks
const {network, ethers} = require("hardhat")
const {developmentchains} = require("../helper-hardhat-config")
const BASE_FEE = ethers.parseEther("0.25") // 0.25 is the premium. it costs 0.25 link per request
// console.log(BASE_FEE)
const GAS_PRICE_LINK = 1e9
// console.log(GAS_PRICE_LINK)
module.exports = async function ({getNamedAccounts, deployments}) {
    const {deploy, log} = deployments
    const {deployer} = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]
    if (developmentchains.includes(network.name)) {
        log("local network detected! deploying mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        log("Mocks Deployed!")
        log("------------------------------------------")
    }
}
module.exports.tags = ["all", "mocks"]
