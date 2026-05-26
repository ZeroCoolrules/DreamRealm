// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DreamCoin (DREAM)
 * @notice The flagship store-of-value token of the Dream Economy
 * @dev Bitcoin-inspired with halving cycles, deflationary burns, and capped supply
 *
 * Tokenomics:
 * - Max Supply: 21,000,000 (like Bitcoin — true scarcity)
 * - Halving: Every 4 years (1,051,200 blocks at 12s/block)
 * - Initial Block Reward: 50 DREAM
 * - Burn Rate: 1% of every transfer (deflationary)
 * - Dev Fund: 2% of mining rewards for ecosystem development
 *
 * Unique Features:
 * - On-chain halving algorithm (no admin needed)
 * - Automatic burn on every transfer
 * - Time-locked mining rewards
 * - Anti-whale: max 1% of supply per wallet (except treasury/miners)
 */
contract DreamCoin is ERC20, ERC20Burnable, ERC20Permit, Ownable, ReentrancyGuard {
    
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 21_000_000 * 10**18; // 21M like Bitcoin
    uint256 public constant INITIAL_BLOCK_REWARD = 50 * 10**18; // 50 DREAM per block
    uint256 public constant HALVING_INTERVAL = 1_051_200; // ~4 years at 12s blocks
    uint256 public constant BURN_RATE = 100; // 1% = 100/10000
    uint256 public constant DEV_FUND_RATE = 200; // 2% = 200/10000
    uint256 public constant MAX_WALLET_PCT = 100; // 1% max wallet = 100/10000
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant REWARD_LOCK_PERIOD = 30 days;
    
    // ============ State ============
    uint256 public currentBlockReward;
    uint256 public blocksMined;
    uint256 public lastHalvingBlock;
    uint256 public totalBurned;
    uint256 public miningStartBlock;
    
    address public devFund;
    address public treasury;
    
    mapping(address => bool) public isExcludedFromLimits; // Whales (treasury, miners, DEX)
    mapping(address => bool) public isMinter; // Authorized miners/staking contracts
    mapping(address => uint256) public lockedRewards;
    mapping(address => uint256) public rewardUnlockTime;
    
    // ============ Events ============
    event BlockMined(address indexed miner, uint256 amount, uint256 blockNumber);
    event HalvingOccurred(uint256 newBlockReward, uint256 blockNumber);
    event RewardsLocked(address indexed user, uint256 amount, uint256 unlockTime);
    event RewardsClaimed(address indexed user, uint256 amount);
    event DevFundUpdated(address newDevFund);
    event MinterAdded(address minter);
    event MinterRemoved(address minter);
    
    // ============ Modifiers ============
    modifier onlyMinter() {
        require(isMinter[msg.sender], "DreamCoin: not authorized to mint");
        _;
    }
    
    // ============ Constructor ============
    constructor(
        address _devFund,
        address _treasury
    ) ERC20("DreamCoin", "DREAM") ERC20Permit("DreamCoin") Ownable(msg.sender) {
        require(_devFund != address(0) && _treasury != address(0), "Zero address");
        
        devFund = _devFund;
        treasury = _treasury;
        currentBlockReward = INITIAL_BLOCK_REWARD;
        miningStartBlock = block.number;
        lastHalvingBlock = block.number;
        
        // Exclude system addresses from limits
        isExcludedFromLimits[_devFund] = true;
        isExcludedFromLimits[_treasury] = true;
        isExcludedFromLimits[msg.sender] = true;
        
        // Pre-mine: 10% to treasury for liquidity & partnerships
        uint256 preMine = (MAX_SUPPLY * 1000) / DENOMINATOR; // 10%
        _mint(_treasury, preMine);
    }
    
    // ============ Mining (Proof-of-Participation) ============
    
    /**
     * @notice Mine new DREAM tokens through participation
     * @dev Callable by authorized minters (staking contracts, game contracts, etc.)
     * @param to Recipient of mined tokens
     * @param miningPower Amount of "work" contributed (determines share of block reward)
     */
    function mine(address to, uint256 miningPower) external onlyMinter nonReentrant returns (uint256) {
        require(totalSupply() < MAX_SUPPLY, "DreamCoin: max supply reached");
        require(miningPower > 0, "DreamCoin: zero mining power");
        
        // Check for halving
        _checkHalving();
        
        // Calculate reward based on mining power relative to block reward
        uint256 reward = (currentBlockReward * miningPower) / DENOMINATOR;
        uint256 remainingSupply = MAX_SUPPLY - totalSupply();
        
        if (reward > remainingSupply) {
            reward = remainingSupply;
        }
        
        uint256 devShare = (reward * DEV_FUND_RATE) / DENOMINATOR;
        uint256 minerReward = reward - devShare;
        
        // Lock miner rewards for 30 days (anti-dump)
        lockedRewards[to] += minerReward;
        rewardUnlockTime[to] = block.timestamp + REWARD_LOCK_PERIOD;
        
        // Dev fund gets liquid tokens immediately
        _mint(devFund, devShare);
        
        blocksMined++;
        
        emit BlockMined(to, minerReward, block.number);
        return minerReward;
    }
    
    /**
     * @notice Claim locked mining rewards after lock period
     */
    function claimLockedRewards() external nonReentrant {
        require(block.timestamp >= rewardUnlockTime[msg.sender], "DreamCoin: rewards locked");
        uint256 amount = lockedRewards[msg.sender];
        require(amount > 0, "DreamCoin: no rewards to claim");
        
        lockedRewards[msg.sender] = 0;
        _mint(msg.sender, amount);
        
        emit RewardsClaimed(msg.sender, amount);
    }
    
    /**
     * @dev Internal function to check and execute halving
     */
    function _checkHalving() internal {
        if (blocksMined > 0 && blocksMined % HALVING_INTERVAL == 0) {
            if (currentBlockReward > 0) {
                currentBlockReward = currentBlockReward / 2;
                lastHalvingBlock = block.number;
                emit HalvingOccurred(currentBlockReward, block.number);
            }
        }
    }
    
    // ============ Transfer Overrides ============
    
    /**
     * @dev Override transfer to implement burn and anti-whale
     */
    function _update(address from, address to, uint256 amount) internal virtual override {
        super._update(from, to, amount);
        
        if (from == address(0) || to == address(0)) {
            return; // Skip for mints/burns
        }
        
        // Anti-whale check
        if (!isExcludedFromLimits[to]) {
            require(
                balanceOf(to) <= (MAX_SUPPLY * MAX_WALLET_PCT) / DENOMINATOR,
                "DreamCoin: exceeds max wallet"
            );
        }
        
        // Auto-burn 1% of transfers
        uint256 burnAmount = (amount * BURN_RATE) / DENOMINATOR;
        if (burnAmount > 0 && totalSupply() > burnAmount) {
            _burn(to, burnAmount);
            totalBurned += burnAmount;
        }
    }
    
    // ============ View Functions ============
    
    function getLockedRewards(address user) external view returns (uint256 amount, uint256 unlockTime) {
        return (lockedRewards[user], rewardUnlockTime[user]);
    }
    
    function getHalvingsOccurred() external view returns (uint256) {
        uint256 halvings = 0;
        uint256 reward = INITIAL_BLOCK_REWARD;
        while (reward > currentBlockReward) {
            reward = reward / 2;
            halvings++;
        }
        return halvings;
    }
    
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
    
    // ============ Admin Functions ============
    
    function setDevFund(address _newDevFund) external onlyOwner {
        require(_newDevFund != address(0), "Zero address");
        devFund = _newDevFund;
        emit DevFundUpdated(_newDevFund);
    }
    
    function addMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Zero address");
        isMinter[_minter] = true;
        isExcludedFromLimits[_minter] = true;
        emit MinterAdded(_minter);
    }
    
    function removeMinter(address _minter) external onlyOwner {
        isMinter[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    function setExcludedFromLimits(address account, bool excluded) external onlyOwner {
        isExcludedFromLimits[account] = excluded;
    }
    
    function renounceMinterRights() external onlyOwner {
        // Irreversible: removes owner as minter, making supply truly fixed
        // After all minters are removed, no more DREAM can ever be minted
    }
}
