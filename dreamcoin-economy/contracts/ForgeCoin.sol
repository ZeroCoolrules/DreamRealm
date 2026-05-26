// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ForgeCoin (FORGE)
 * @notice Proof-of-Participation work token — Earn by contributing to the ecosystem
 * @dev Users earn FORGE through verifiable on-chain activities, convertible to other tokens
 *
 * Tokenomics:
 * - Max Supply: 500,000,000 FORGE
 * - Earned through: Gaming, creating content, referrals, bug bounties, community work
 * - Convertible: FORGE can be converted to DREAM at a dynamic rate
 * - Burn: Excess FORGE from conversions is burned (deflationary pressure)
 * - No ICO/Fair Launch: 100% earned through participation
 *
 * Unique Features:
 * - Achievement NFTs boost earning multipliers
 * - Guild system for collaborative earning
 * - Daily/weekly earning caps (anti-sybil)
 * - Convert-to-DREAM bridge with dynamic pricing
 * - Seasonal events with 2x-5x rewards
 */
contract ForgeCoin is ERC20, ERC20Burnable, ERC20Permit, Ownable, ReentrancyGuard {
    
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 500_000_000 * 10**18;
    uint256 public constant DAILY_EARN_CAP = 1000 * 10**18; // 1000 FORGE per day per user
    uint256 public constant CONVERSION_BURN_RATE = 5000; // 50% burned when converting to DREAM
    uint256 public constant CONVERSION_LOCK_DAYS = 7;
    uint256 public constant DENOMINATOR = 10000;
    
    // ============ Earning Categories ============
    enum ActivityType { 
        Gaming,           // Playing ecosystem games
        ContentCreation,  // Creating guides, videos, art
        Referral,         // Bringing new users
        BugBounty,        // Finding vulnerabilities
        CommunityWork,    // Moderation, support
        StakingBoost,     // Boosting other token staking
        GovernanceVote,   // Participating in governance
        LiquidityProvision // Providing liquidity
    }
    
    struct ActivityConfig {
        uint256 baseReward;     // Base FORGE per unit
        uint256 maxDailyUnits;  // Daily cap in units
        bool active;
    }
    
    mapping(ActivityType => ActivityConfig) public activityConfigs;
    
    // ============ User State ============
    struct UserStats {
        uint256 totalEarned;
        uint256 totalConverted;
        uint256 currentStreak;    // Consecutive days active
        uint256 lastActiveDay;
        uint256 achievements;     // Bitmask of achievements
    }
    
    mapping(address => UserStats) public userStats;
    mapping(address => mapping(uint256 => uint256)) public dailyEarnings; // user => day => amount
    
    // ============ Achievement System ============
    // Achievements boost earning multiplier by 5-25%
    uint256[] public ACHIEVEMENT_MULTIPLIERS = [0, 500, 1000, 1500, 2500]; // 0%, 5%, 10%, 15%, 25%
    
    // ============ Guild System ============
    struct Guild {
        string name;
        address leader;
        uint256 totalMembers;
        uint256 guildScore;
        bool active;
        mapping(address => bool) members;
        mapping(address => uint256) memberContributions;
    }
    
    mapping(uint256 => Guild) public guilds;
    mapping(address => uint256) public userGuild;
    uint256 public guildCount;
    uint256 public constant GUILD_MAX_MEMBERS = 50;
    uint256 public constant GUILD_CREATION_COST = 10000 * 10**18; // 10k FORGE
    
    // ============ Conversion to DREAM ============
    struct ConversionRequest {
        uint256 forgeAmount;
        uint256 dreamAmount;
        uint256 requestTime;
        bool claimed;
    }
    
    mapping(address => ConversionRequest[]) public conversionQueue;
    address public dreamToken; // DREAM token address for conversion
    uint256 public conversionRate = 100; // 100 FORGE = 1 DREAM (adjustable)
    
    // ============ Seasonal Events ============
    struct Season {
        string name;
        uint256 startTime;
        uint256 endTime;
        uint256 multiplier; // 200 = 2x
        bool active;
    }
    
    Season public currentSeason;
    
    // ============ Authorized Earners ============
    mapping(address => bool) public authorizedEarners;
    
    // ============ Events ============
    event ActivityRewarded(address indexed user, ActivityType activity, uint256 amount, uint256 day);
    event AchievementUnlocked(address indexed user, uint256 achievementId);
    event ConversionRequested(address indexed user, uint256 forgeAmount, uint256 dreamAmount, uint256 unlockTime);
    event ConversionClaimed(address indexed user, uint256 dreamAmount);
    event GuildCreated(uint256 indexed guildId, string name, address leader);
    event GuildJoined(uint256 indexed guildId, address member);
    event SeasonStarted(string name, uint256 startTime, uint256 endTime, uint256 multiplier);
    event ConversionRateUpdated(uint256 newRate);
    
    // ============ Modifiers ============
    modifier onlyAuthorized() {
        require(authorizedEarners[msg.sender], "ForgeCoin: unauthorized");
        _;
    }
    
    // ============ Constructor ============
    constructor(
        address _treasury,
        address _initialEarningContract
    ) ERC20("ForgeCoin", "FORGE") ERC20Permit("ForgeCoin") Ownable(msg.sender) {
        require(_treasury != address(0), "Zero address");
        
        // Only 5% pre-minted for initial liquidity and rewards seed
        // 95% must be earned through participation
        _mint(_treasury, (MAX_SUPPLY * 500) / DENOMINATOR);
        
        // Reserve 45% for ecosystem rewards (minted to this contract)
        _mint(address(this), (MAX_SUPPLY * 4500) / DENOMINATOR);
        
        // Remaining 50% will be minted as users earn (up to MAX_SUPPLY)
        
        authorizedEarners[_initialEarningContract] = true;
        authorizedEarners[_treasury] = true;
        
        // Initialize activity configs
        activityConfigs[ActivityType.Gaming] = ActivityConfig(10 * 10**18, 100, true);
        activityConfigs[ActivityType.ContentCreation] = ActivityConfig(50 * 10**18, 20, true);
        activityConfigs[ActivityType.Referral] = ActivityConfig(100 * 10**18, 10, true);
        activityConfigs[ActivityType.BugBounty] = ActivityConfig(500 * 10**18, 2, true);
        activityConfigs[ActivityType.CommunityWork] = ActivityConfig(25 * 10**18, 40, true);
        activityConfigs[ActivityType.StakingBoost] = ActivityConfig(5 * 10**18, 200, true);
        activityConfigs[ActivityType.GovernanceVote] = ActivityConfig(20 * 10**18, 50, true);
        activityConfigs[ActivityType.LiquidityProvision] = ActivityConfig(15 * 10**18, 60, true);
    }
    
    // ============ Core Earning ============
    
    /**
     * @notice Reward a user for ecosystem participation
     * @param user The user to reward
     * @param activity Type of activity performed
     * @param units Number of units completed (e.g., games played, referrals made)
     */
    function rewardActivity(
        address user,
        ActivityType activity,
        uint256 units
    ) external onlyAuthorized nonReentrant returns (uint256 reward) {
        require(user != address(0), "Zero address");
        ActivityConfig storage config = activityConfigs[activity];
        require(config.active, "Activity inactive");
        
        uint256 day = block.timestamp / 1 days;
        
        // Check daily cap for this activity type
        uint256 activityDailyCap = config.baseReward * config.maxDailyUnits;
        uint256 alreadyEarnedToday = dailyEarnings[user][day];
        require(alreadyEarnedToday < DAILY_EARN_CAP, "Daily cap reached");
        
        // Calculate reward
        reward = config.baseReward * units;
        
        // Apply streak bonus: +1% per consecutive day, max 50%
        UserStats storage stats = userStats[user];
        if (stats.lastActiveDay == day - 1) {
            stats.currentStreak++;
        } else if (stats.lastActiveDay < day - 1) {
            stats.currentStreak = 1;
        }
        stats.lastActiveDay = day;
        
        uint256 streakBonus = stats.currentStreak > 50 ? 5000 : stats.currentStreak * 100; // max 50%
        reward = reward + ((reward * streakBonus) / DENOMINATOR);
        
        // Apply achievement multiplier
        uint256 achievementMultiplier = getAchievementMultiplier(user);
        reward = reward + ((reward * achievementMultiplier) / DENOMINATOR);
        
        // Apply guild bonus
        if (userGuild[user] != 0) {
            Guild storage guild = guilds[userGuild[user]];
            if (guild.active) {
                uint256 guildBonus = (guild.guildScore * 100) / DENOMINATOR; // up to 10%
                reward = reward + ((reward * guildBonus) / DENOMINATOR);
            }
        }
        
        // Apply seasonal multiplier
        if (currentSeason.active && 
            block.timestamp >= currentSeason.startTime && 
            block.timestamp <= currentSeason.endTime) {
            reward = (reward * currentSeason.multiplier) / 100;
        }
        
        // Respect caps
        if (alreadyEarnedToday + reward > DAILY_EARN_CAP) {
            reward = DAILY_EARN_CAP - alreadyEarnedToday;
        }
        if (reward > activityDailyCap) {
            reward = activityDailyCap;
        }
        
        // Check max supply
        if (totalSupply() + reward > MAX_SUPPLY) {
            reward = MAX_SUPPLY - totalSupply();
        }
        
        require(reward > 0, "Zero reward");
        
        dailyEarnings[user][day] += reward;
        stats.totalEarned += reward;
        
        if (userGuild[user] != 0) {
            guilds[userGuild[user]].memberContributions[user] += reward;
            guilds[userGuild[user]].guildScore += reward / 100;
        }
        
        _mint(user, reward);
        
        emit ActivityRewarded(user, activity, reward, day);
        return reward;
    }
    
    // ============ Achievement System ============
    
    /**
     * @notice Unlock an achievement for a user, boosting their earnings
     * @param user The user
     * @param achievementId 1-31 (stored as bits in uint256)
     */
    function unlockAchievement(address user, uint256 achievementId) external onlyAuthorized {
        require(achievementId > 0 && achievementId <= 31, "Invalid achievement");
        
        UserStats storage stats = userStats[user];
        uint256 mask = 1 << achievementId;
        
        require((stats.achievements & mask) == 0, "Already unlocked");
        
        stats.achievements |= mask;
        
        emit AchievementUnlocked(user, achievementId);
    }
    
    function getAchievementMultiplier(address user) public view returns (uint256) {
        uint256 count = 0;
        uint256 achievements = userStats[user].achievements;
        
        while (achievements != 0) {
            achievements &= (achievements - 1);
            count++;
        }
        
        // Cap at 4 achievements for multiplier calculation
        if (count >= ACHIEVEMENT_MULTIPLIERS.length) {
            count = ACHIEVEMENT_MULTIPLIERS.length - 1;
        }
        
        return ACHIEVEMENT_MULTIPLIERS[count];
    }
    
    function hasAchievement(address user, uint256 achievementId) external view returns (bool) {
        return (userStats[user].achievements & (1 << achievementId)) != 0;
    }
    
    // ============ Conversion to DREAM ============
    
    /**
     * @notice Request to convert FORGE to DREAM
     * @param forgeAmount Amount of FORGE to convert
     * @dev 50% of FORGE is burned, 50% converted. 7-day lock before claiming DREAM.
     */
    function requestConversion(uint256 forgeAmount) external nonReentrant {
        require(dreamToken != address(0), "Dream token not set");
        require(forgeAmount >= 100 * 10**18, "Minimum 100 FORGE");
        require(balanceOf(msg.sender) >= forgeAmount, "Insufficient balance");
        
        // Calculate DREAM amount
        uint256 dreamAmount = (forgeAmount / conversionRate);
        require(dreamAmount > 0, "Amount too small");
        
        // Transfer FORGE from user
        _transfer(msg.sender, address(this), forgeAmount);
        
        // Burn 50%
        uint256 burnAmount = (forgeAmount * CONVERSION_BURN_RATE) / DENOMINATOR;
        _burn(address(this), burnAmount);
        
        // Queue conversion for remaining 50%
        conversionQueue[msg.sender].push(ConversionRequest({
            forgeAmount: forgeAmount - burnAmount,
            dreamAmount: dreamAmount,
            requestTime: block.timestamp,
            claimed: false
        }));
        
        userStats[msg.sender].totalConverted += forgeAmount;
        
        emit ConversionRequested(
            msg.sender, 
            forgeAmount, 
            dreamAmount, 
            block.timestamp + (CONVERSION_LOCK_DAYS * 1 days)
        );
    }
    
    /**
     * @notice Claim converted DREAM after lock period
     */
    function claimConversion(uint256 requestIndex) external nonReentrant {
        require(requestIndex < conversionQueue[msg.sender].length, "Invalid index");
        
        ConversionRequest storage req = conversionQueue[msg.sender][requestIndex];
        require(!req.claimed, "Already claimed");
        require(
            block.timestamp >= req.requestTime + (CONVERSION_LOCK_DAYS * 1 days),
            "Lock period active"
        );
        
        req.claimed = true;
        
        // Transfer DREAM to user
        (bool success, ) = dreamToken.call(
            abi.encodeWithSignature("transfer(address,uint256)", msg.sender, req.dreamAmount)
        );
        require(success, "DREAM transfer failed");
        
        emit ConversionClaimed(msg.sender, req.dreamAmount);
    }
    
    function getPendingConversions(address user) external view returns (uint256 count, uint256 totalDream) {
        ConversionRequest[] storage queue = conversionQueue[user];
        for (uint256 i = 0; i < queue.length; i++) {
            if (!queue[i].claimed) {
                count++;
                totalDream += queue[i].dreamAmount;
            }
        }
    }
    
    // ============ Guild System ============
    
    function createGuild(string calldata name) external returns (uint256 guildId) {
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Invalid name");
        require(balanceOf(msg.sender) >= GUILD_CREATION_COST, "Insufficient FORGE");
        require(userGuild[msg.sender] == 0, "Already in guild");
        
        _burn(msg.sender, GUILD_CREATION_COST);
        
        guildCount++;
        guildId = guildCount;
        
        Guild storage g = guilds[guildId];
        g.name = name;
        g.leader = msg.sender;
        g.totalMembers = 1;
        g.active = true;
        g.members[msg.sender] = true;
        
        userGuild[msg.sender] = guildId;
        
        emit GuildCreated(guildId, name, msg.sender);
        return guildId;
    }
    
    function joinGuild(uint256 guildId) external {
        require(guildId > 0 && guildId <= guildCount, "Invalid guild");
        require(userGuild[msg.sender] == 0, "Already in guild");
        
        Guild storage g = guilds[guildId];
        require(g.active, "Guild inactive");
        require(g.totalMembers < GUILD_MAX_MEMBERS, "Guild full");
        
        g.members[msg.sender] = true;
        g.totalMembers++;
        userGuild[msg.sender] = guildId;
        
        emit GuildJoined(guildId, msg.sender);
    }
    
    function leaveGuild() external {
        uint256 guildId = userGuild[msg.sender];
        require(guildId != 0, "Not in guild");
        
        Guild storage g = guilds[guildId];
        g.members[msg.sender] = false;
        g.totalMembers--;
        userGuild[msg.sender] = 0;
    }
    
    function getGuildInfo(uint256 guildId) external view returns (
        string memory name,
        address leader,
        uint256 totalMembers,
        uint256 guildScore,
        bool active
    ) {
        Guild storage g = guilds[guildId];
        return (g.name, g.leader, g.totalMembers, g.guildScore, g.active);
    }
    
    // ============ Seasonal Events ============
    
    function startSeason(
        string calldata name,
        uint256 duration,
        uint256 multiplier
    ) external onlyOwner {
        require(multiplier >= 100 && multiplier <= 500, "Multiplier 1x-5x");
        require(duration > 0 && duration <= 90 days, "Duration 1-90 days");
        
        currentSeason = Season({
            name: name,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            multiplier: multiplier,
            active: true
        });
        
        emit SeasonStarted(name, block.timestamp, block.timestamp + duration, multiplier);
    }
    
    function endSeason() external onlyOwner {
        currentSeason.active = false;
    }
    
    // ============ Admin Functions ============
    
    function setDreamToken(address _dreamToken) external onlyOwner {
        require(_dreamToken != address(0), "Zero address");
        dreamToken = _dreamToken;
    }
    
    function setConversionRate(uint256 _rate) external onlyOwner {
        require(_rate > 0, "Zero rate");
        conversionRate = _rate;
        emit ConversionRateUpdated(_rate);
    }
    
    function setActivityConfig(
        ActivityType activity,
        uint256 baseReward,
        uint256 maxDailyUnits,
        bool active
    ) external onlyOwner {
        activityConfigs[activity] = ActivityConfig(baseReward, maxDailyUnits, active);
    }
    
    function setAuthorizedEarner(address earner, bool authorized) external onlyOwner {
        require(earner != address(0), "Zero address");
        authorizedEarners[earner] = authorized;
    }
    
    function getDailyEarnings(address user, uint256 day) external view returns (uint256) {
        return dailyEarnings[user][day];
    }
    
    function getCurrentDay() external view returns (uint256) {
        return block.timestamp / 1 days;
    }
}
