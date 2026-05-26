// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title StakingVault
 * @notice Multi-token yield farming vault with time-lock bonuses and compound rewards
 * @dev Stake any ecosystem token to earn yield in multiple reward tokens
 *
 * Features:
 * - Multi-token staking (DREAM, CUPID, SPARK, FORGE, GUARD, LP tokens)
 * - Time-lock bonuses: 7d (1.2x), 30d (1.5x), 90d (2x), 365d (3x)
 * - Compound rewards: Auto-compound option
 * - Boost NFTs: Special achievements boost APY
 * - Flexible staking: Withdraw anytime with decreasing penalty
 * - Reward tokens: Earn in multiple tokens simultaneously
 */
contract StakingVault is Ownable, ReentrancyGuard, Pausable {
    
    // ============ Constants ============
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant EARLY_WITHDRAW_MAX_PENALTY = 2500; // 25% max penalty
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18; // 100 tokens min
    
    // Time-lock multipliers (in basis points)
    struct LockTier {
        uint256 duration;
        uint256 multiplier; // 12000 = 1.2x
        string name;
    }
    
    LockTier[] public lockTiers;
    
    // ============ Reward Tokens ============
    struct RewardToken {
        address token;
        uint256 rewardPerSecond; // Per token staked, scaled
        uint256 accRewardPerShare;
        uint256 lastUpdateTime;
        bool active;
    }
    
    RewardToken[] public rewardTokens;
    mapping(address => uint256) public rewardTokenIndex; // token => index+1 (0 = not found)
    
    // ============ Staking Pools ============
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lockDuration;
        uint256 lockEnd;
        uint256 rewardDebt; // Track claimed rewards
        uint256 tierIndex;
        bool autoCompound;
    }
    
    struct StakingPool {
        address stakeToken;
        uint256 totalStaked;
        uint256 accRewardPerShare;
        uint256 lastUpdateTime;
        bool active;
        uint256 allocPoint; // Allocation points for reward distribution
    }
    
    mapping(address => StakingPool) public pools;
    mapping(address => mapping(address => StakeInfo[])) public userStakes; // pool => user => stakes
    mapping(address => uint256) public userTotalStaked; // pool => user => total
    address[] public poolList;
    uint256 public totalAllocPoints;
    
    // ============ Boost System ============
    mapping(address => uint256) public userBoostMultiplier; // 10000 = 1x, 15000 = 1.5x
    mapping(address => bool) public authorizedBoostContracts;
    
    // ============ Treasury ============
    address public treasury;
    uint256 public performanceFee = 500; // 5% on rewards
    
    // ============ Events ============
    event Staked(
        address indexed user,
        address indexed stakeToken,
        uint256 amount,
        uint256 lockDuration,
        uint256 multiplier
    );
    event Unstaked(
        address indexed user,
        address indexed stakeToken,
        uint256 amount,
        uint256 penalty,
        uint256 received
    );
    event RewardClaimed(
        address indexed user,
        address indexed stakeToken,
        address indexed rewardToken,
        uint256 amount
    );
    event RewardCompounded(
        address indexed user,
        address indexed stakeToken,
        uint256 amount
    );
    event PoolAdded(address indexed stakeToken, uint256 allocPoint);
    event RewardTokenAdded(address indexed token, uint256 rewardPerSecond);
    event BoostApplied(address indexed user, uint256 multiplier);
    
    // ============ Constructor ============
    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
        
        // Initialize lock tiers
        lockTiers.push(LockTier({duration: 0, multiplier: 10000, name: "Flexible"}));
        lockTiers.push(LockTier({duration: 7 days, multiplier: 12000, name: "1 Week"}));
        lockTiers.push(LockTier({duration: 30 days, multiplier: 15000, name: "1 Month"}));
        lockTiers.push(LockTier({duration: 90 days, multiplier: 20000, name: "3 Months"}));
        lockTiers.push(LockTier({duration: 365 days, multiplier: 30000, name: "1 Year"}));
    }
    
    // ============ Staking ============
    
    /**
     * @notice Stake tokens to earn rewards
     * @param stakeToken Token to stake
     * @param amount Amount to stake
     * @param tierIndex Lock tier (0=flexible, 1=7d, 2=30d, 3=90d, 4=365d)
     * @param autoCompound Automatically compound rewards
     */
    function stake(
        address stakeToken,
        uint256 amount,
        uint256 tierIndex,
        bool autoCompound
    ) external nonReentrant whenNotPaused {
        require(pools[stakeToken].active, "Pool inactive");
        require(amount >= MIN_STAKE_AMOUNT, "Below minimum");
        require(tierIndex < lockTiers.length, "Invalid tier");
        
        StakingPool storage pool = pools[stakeToken];
        LockTier memory tier = lockTiers[tierIndex];
        
        // Update pool rewards
        _updatePool(stakeToken);
        
        // Transfer stake tokens
        _safeTransferFrom(stakeToken, msg.sender, address(this), amount);
        
        uint256 lockEnd = block.timestamp + tier.duration;
        
        userStakes[stakeToken][msg.sender].push(StakeInfo({
            amount: amount,
            startTime: block.timestamp,
            lockDuration: tier.duration,
            lockEnd: lockEnd,
            rewardDebt: (amount * pool.accRewardPerShare) / 1e18,
            tierIndex: tierIndex,
            autoCompound: autoCompound
        }));
        
        userTotalStaked[stakeToken][msg.sender] += amount;
        pool.totalStaked += amount;
        
        emit Staked(msg.sender, stakeToken, amount, tier.duration, tier.multiplier);
    }
    
    /**
     * @notice Unstake tokens from a specific position
     * @param stakeToken Pool token
     * @param stakeIndex Index in user's stake array
     */
    function unstake(
        address stakeToken,
        uint256 stakeIndex
    ) external nonReentrant returns (uint256 received) {
        StakingPool storage pool = pools[stakeToken];
        require(pool.active, "Pool inactive");
        
        StakeInfo[] storage stakes = userStakes[stakeToken][msg.sender];
        require(stakeIndex < stakes.length, "Invalid stake");
        
        StakeInfo storage stakeInfo = stakes[stakeIndex];
        require(stakeInfo.amount > 0, "Already unstaked");
        
        // Update pool
        _updatePool(stakeToken);
        
        // Claim any pending rewards first
        _claimRewards(stakeToken, stakeIndex);
        
        uint256 amount = stakeInfo.amount;
        uint256 penalty = 0;
        
        // Calculate penalty for early withdrawal
        if (block.timestamp < stakeInfo.lockEnd && stakeInfo.lockDuration > 0) {
            uint256 timeElapsed = block.timestamp - stakeInfo.startTime;
            uint256 timeProgress = (timeElapsed * DENOMINATOR) / stakeInfo.lockDuration;
            
            // Penalty decreases linearly from max to 0
            if (timeProgress < DENOMINATOR) {
                penalty = (amount * EARLY_WITHDRAW_MAX_PENALTY * (DENOMINATOR - timeProgress)) / (DENOMINATOR * DENOMINATOR);
            }
        }
        
        received = amount - penalty;
        
        // Update state
        pool.totalStaked -= amount;
        userTotalStaked[stakeToken][msg.sender] -= amount;
        stakeInfo.amount = 0; // Mark as unstaked
        
        // Transfer tokens back
        _safeTransfer(stakeToken, msg.sender, received);
        
        // Send penalty to treasury
        if (penalty > 0) {
            _safeTransfer(stakeToken, treasury, penalty);
        }
        
        emit Unstaked(msg.sender, stakeToken, amount, penalty, received);
        return received;
    }
    
    /**
     * @notice Claim rewards for a specific stake
     */
    function claimRewards(address stakeToken, uint256 stakeIndex) external nonReentrant {
        _updatePool(stakeToken);
        _claimRewards(stakeToken, stakeIndex);
    }
    
    /**
     * @notice Claim all rewards across all pools and stakes
     */
    function claimAllRewards() external nonReentrant {
        for (uint256 p = 0; p < poolList.length; p++) {
            address stakeToken = poolList[p];
            if (!pools[stakeToken].active) continue;
            
            _updatePool(stakeToken);
            
            StakeInfo[] storage stakes = userStakes[stakeToken][msg.sender];
            for (uint256 s = 0; s < stakes.length; s++) {
                if (stakes[s].amount > 0) {
                    _claimRewards(stakeToken, s);
                }
            }
        }
    }
    
    // ============ Internal Reward Logic ============
    
    function _updatePool(address stakeToken) internal {
        StakingPool storage pool = pools[stakeToken];
        if (block.timestamp <= pool.lastUpdateTime) return;
        
        if (pool.totalStaked == 0) {
            pool.lastUpdateTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - pool.lastUpdateTime;
        
        // Update for each reward token
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            if (!rewardTokens[i].active) continue;
            
            uint256 reward = timeElapsed * rewardTokens[i].rewardPerSecond;
            
            // Weight by allocation points
            reward = (reward * pool.allocPoint) / totalAllocPoints;
            
            rewardTokens[i].accRewardPerShare += (reward * 1e18) / pool.totalStaked;
        }
        
        pool.lastUpdateTime = block.timestamp;
    }
    
    function _claimRewards(address stakeToken, uint256 stakeIndex) internal {
        StakeInfo storage stakeInfo = userStakes[stakeToken][msg.sender][stakeIndex];
        if (stakeInfo.amount == 0) return;
        
        StakingPool storage pool = pools[stakeToken];
        LockTier memory tier = lockTiers[stakeInfo.tierIndex];
        uint256 boost = userBoostMultiplier[msg.sender];
        if (boost == 0) boost = 10000;
        
        uint256 effectiveMultiplier = (tier.multiplier * boost) / 10000;
        
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            if (!rewardTokens[i].active) continue;
            
            RewardToken storage rt = rewardTokens[i];
            
            uint256 pending = ((stakeInfo.amount * rt.accRewardPerShare) / 1e18) - stakeInfo.rewardDebt;
            pending = (pending * effectiveMultiplier) / 10000;
            
            if (pending == 0) continue;
            
            // Performance fee
            uint256 fee = (pending * performanceFee) / DENOMINATOR;
            uint256 netReward = pending - fee;
            
            if (stakeInfo.autoCompound && rewardTokens[i].token == stakeToken) {
                // Auto-compound: add to stake
                stakeInfo.amount += netReward;
                pool.totalStaked += netReward;
                userTotalStaked[stakeToken][msg.sender] += netReward;
                
                emit RewardCompounded(msg.sender, stakeToken, netReward);
            } else {
                // Transfer reward token
                _safeTransfer(rewardTokens[i].token, msg.sender, netReward);
                
                if (fee > 0) {
                    _safeTransfer(rewardTokens[i].token, treasury, fee);
                }
                
                emit RewardClaimed(msg.sender, stakeToken, rewardTokens[i].token, netReward);
            }
        }
        
        // Update reward debt
        uint256 totalRewardDebt = 0;
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            if (rewardTokens[i].active) {
                totalRewardDebt += (stakeInfo.amount * rewardTokens[i].accRewardPerShare) / 1e18;
            }
        }
        stakeInfo.rewardDebt = totalRewardDebt / rewardTokens.length;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Calculate pending rewards for a stake
     */
    function pendingRewards(
        address stakeToken,
        address user,
        uint256 stakeIndex
    ) external view returns (address[] memory tokens, uint256[] memory amounts) {
        StakeInfo storage stakeInfo = userStakes[stakeToken][user][stakeIndex];
        StakingPool storage pool = pools[stakeToken];
        
        tokens = new address[](rewardTokens.length);
        amounts = new uint256[](rewardTokens.length);
        
        if (stakeInfo.amount == 0 || pool.totalStaked == 0) return (tokens, amounts);
        
        uint256 timeElapsed = block.timestamp - pool.lastUpdateTime;
        LockTier memory tier = lockTiers[stakeInfo.tierIndex];
        uint256 boost = userBoostMultiplier[user];
        if (boost == 0) boost = 10000;
        
        uint256 effectiveMultiplier = (tier.multiplier * boost) / 10000;
        
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            if (!rewardTokens[i].active) continue;
            
            uint256 reward = timeElapsed * rewardTokens[i].rewardPerSecond;
            reward = (reward * pool.allocPoint) / totalAllocPoints;
            
            uint256 accReward = rewardTokens[i].accRewardPerShare + ((reward * 1e18) / pool.totalStaked);
            
            uint256 pending = ((stakeInfo.amount * accReward) / 1e18) - stakeInfo.rewardDebt;
            pending = (pending * effectiveMultiplier) / 10000;
            
            uint256 fee = (pending * performanceFee) / DENOMINATOR;
            
            tokens[i] = rewardTokens[i].token;
            amounts[i] = pending - fee;
        }
        
        return (tokens, amounts);
    }
    
    /**
     * @notice Get all user stakes for a pool
     */
    function getUserStakes(
        address stakeToken,
        address user
    ) external view returns (StakeInfo[] memory) {
        return userStakes[stakeToken][user];
    }
    
    /**
     * @notice Calculate APY for a pool and tier
     */
    function getAPY(
        address stakeToken,
        uint256 tierIndex
    ) external view returns (uint256 apy) {
        StakingPool storage pool = pools[stakeToken];
        if (pool.totalStaked == 0) return 0;
        
        LockTier memory tier = lockTiers[tierIndex];
        
        uint256 yearlyRewardValue = 0;
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            if (!rewardTokens[i].active) continue;
            
            uint256 yearlyReward = rewardTokens[i].rewardPerSecond * 365 days;
            yearlyReward = (yearlyReward * pool.allocPoint) / totalAllocPoints;
            yearlyRewardValue += yearlyReward;
        }
        
        apy = (yearlyRewardValue * tier.multiplier * 100) / (pool.totalStaked * 10000);
        return apy;
    }
    
    // ============ Boost System ============
    
    /**
     * @notice Apply a boost multiplier to a user (from achievements, NFTs, etc)
     */
    function applyBoost(address user, uint256 multiplier) external {
        require(authorizedBoostContracts[msg.sender] || msg.sender == owner(), "Unauthorized");
        require(multiplier >= 10000 && multiplier <= 20000, "1x-2x range"); // Max 2x boost
        
        userBoostMultiplier[user] = multiplier;
        emit BoostApplied(user, multiplier);
    }
    
    function removeBoost(address user) external {
        require(authorizedBoostContracts[msg.sender] || msg.sender == owner(), "Unauthorized");
        userBoostMultiplier[user] = 10000;
    }
    
    // ============ Admin Functions ============
    
    function addPool(address stakeToken, uint256 allocPoint) external onlyOwner {
        require(stakeToken != address(0), "Zero address");
        require(!pools[stakeToken].active, "Pool exists");
        
        pools[stakeToken] = StakingPool({
            stakeToken: stakeToken,
            totalStaked: 0,
            accRewardPerShare: 0,
            lastUpdateTime: block.timestamp,
            active: true,
            allocPoint: allocPoint
        });
        
        poolList.push(stakeToken);
        totalAllocPoints += allocPoint;
        
        emit PoolAdded(stakeToken, allocPoint);
    }
    
    function updateAllocPoint(address stakeToken, uint256 newAllocPoint) external onlyOwner {
        require(pools[stakeToken].active, "Pool inactive");
        
        totalAllocPoints = totalAllocPoints - pools[stakeToken].allocPoint + newAllocPoint;
        pools[stakeToken].allocPoint = newAllocPoint;
    }
    
    function addRewardToken(
        address token,
        uint256 rewardPerSecond
    ) external onlyOwner {
        require(token != address(0), "Zero address");
        require(rewardTokenIndex[token] == 0, "Already added");
        
        rewardTokens.push(RewardToken({
            token: token,
            rewardPerSecond: rewardPerSecond,
            accRewardPerShare: 0,
            lastUpdateTime: block.timestamp,
            active: true
        }));
        
        rewardTokenIndex[token] = rewardTokens.length; // Store index+1
        
        emit RewardTokenAdded(token, rewardPerSecond);
    }
    
    function updateRewardRate(uint256 rewardIndex, uint256 newRate) external onlyOwner {
        require(rewardIndex < rewardTokens.length, "Invalid index");
        rewardTokens[rewardIndex].rewardPerSecond = newRate;
    }
    
    function setRewardTokenActive(uint256 rewardIndex, bool active) external onlyOwner {
        require(rewardIndex < rewardTokens.length, "Invalid index");
        rewardTokens[rewardIndex].active = active;
    }
    
    function setAuthorizedBoostContract(address contract_, bool authorized) external onlyOwner {
        authorizedBoostContracts[contract_] = authorized;
    }
    
    function setPerformanceFee(uint256 fee) external onlyOwner {
        require(fee <= 2000, "Max 20%"); // Cap at 20%
        performanceFee = fee;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ Internal Helpers ============
    
    function _safeTransfer(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Transfer failed");
    }
    
    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TransferFrom failed");
    }
    
    // ============ View Functions ============
    
    function getPoolCount() external view returns (uint256) {
        return poolList.length;
    }
    
    function getRewardTokenCount() external view returns (uint256) {
        return rewardTokens.length;
    }
    
    function getLockTiers() external view returns (LockTier[] memory) {
        return lockTiers;
    }
    
    function getUserTotalStaked(address stakeToken, address user) external view returns (uint256) {
        return userTotalStaked[stakeToken][user];
    }
}
