const {network, ethers} = require("hardhat")
const {developmentchains, networkconfig} = require("../helper-hardhat-config")
const {verify} = require("../utils/verify")
const vrf_sub_amount = ethers.parseEther("30")
module.exports = async function ({getNamedAccounts, deployments}) {
    const {deploy, log} = deployments
    const {deployer} = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId
    if (developmentchains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock",
        )
        vrfCoordinatorV2Address = await vrfCoordinatorV2Mock.getAddress()
        const tnx_res = await vrfCoordinatorV2Mock.createSubscription()
        const tnx_receipt = await tnx_res.wait(1)
        // console.log(tnx_receipt)
        subscriptionId = tnx_receipt.logs[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            vrf_sub_amount,
        )
    } else {
        vrfCoordinatorV2Address = networkconfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkconfig[chainId]["subscriptionId"]
    }
    const entranceFee = networkconfig[chainId]["entranceFee"]
    const gasLane = networkconfig[chainId]["gasLane"]
    const callbackGasLimit = networkconfig[chainId]["callbackGasLimit"]
    const interval = networkconfig[chainId]["interval"]
    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ]
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
    if (developmentchains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock",
        )
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
    }
    if (
        !developmentchains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(raffle.address, args)
    }
    log("---------------------------------------------")
}
module.exports.tags = ["all", "raffle"]
