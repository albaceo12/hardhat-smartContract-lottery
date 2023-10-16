// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";
error Raffle__NotEnoughtETHEntered();
error Raffle__TransferFailed();
error Raffle__notOpen();
error Raffle__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 raffleState
);

/**
 * @title A sample Raffle Contract
 * @author Hassan Nouri
 * @notice This contract is for creating and untamperable decntralized samrt contract
 * @dev This implements Chainlink VRF v2 and Chainlink Keepers
 */
contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    enum RaffleState {
        open,
        calculating
    }

    uint256 private immutable i_entrancefee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfcoordinator;
    bytes32 private immutable i_gaslane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant requestConfirmations = 3;
    uint32 private constant numWords = 1;
    //---------------------------------------
    //Lottery Variables
    address payable private s_recentwinner;
    RaffleState private s_rafflestate;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    event RaffleEnter(address indexed player);
    event RequestedRandomwinner(uint256 indexed reqId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subsId,
        uint32 callback_Gas_Limit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entrancefee = entranceFee;
        i_vrfcoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gaslane = gasLane;
        i_subscriptionId = subsId;
        i_callbackGasLimit = callback_Gas_Limit;
        s_rafflestate = RaffleState.open;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function EnterRaffle() public payable {
        if (msg.value < i_entrancefee) {
            revert Raffle__NotEnoughtETHEntered();
        }
        if (s_rafflestate != RaffleState.open) {
            revert Raffle__notOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This the function that the chainlink keeper nodes call
     * they look for the "upkeeperneeded" to return true
     * the following should be true in order to return true:
     * 1.our time interval should have passed
     * 2.the lottery should have at least 1 player, and have some ETH
     * 3.our subscription is funded with link
     * 4.the lottery should be in an "open" state
     */
    // function checkUpkeep(bytes calldata /*checkData*/) external override{}
    function checkUpkeep(
        bytes calldata /*checkData*/
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool isopen = (s_rafflestate == RaffleState.open);
        bool timepassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasplayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isopen && timepassed && hasplayers && hasBalance);
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = this.checkUpkeep(hex"");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_rafflestate)
            );
        }

        s_rafflestate = RaffleState.calculating;
        uint256 requestId = i_vrfcoordinator.requestRandomWords(
            i_gaslane, //gaslane
            i_subscriptionId,
            requestConfirmations,
            i_callbackGasLimit,
            numWords
        );
        // fulfillRandomWords(requestId,);
        emit RequestedRandomwinner(requestId);
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexofwinner = randomWords[0] % s_players.length;
        address payable recentwinner = s_players[indexofwinner];
        s_recentwinner = recentwinner;
        s_rafflestate = RaffleState.open;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentwinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentwinner);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entrancefee;
    }

    function getPLayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentwinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_rafflestate;
    }

    function getNumWords() public pure returns (uint256) {
        return numWords;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return requestConfirmations;
    }
}
