// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SparkCoin (SPARK)
 * @notice Ultra-fast transactional currency of the Dream Economy
 * @dev Dynamic fee structure, instant finality, merchant rewards, and cashback
 *
 * Tokenomics:
 * - Max Supply: 10,000,000,000 SPARK (high velocity, low unit cost)
 * - Transfer Fee: 0.1% base, scales down with volume
 * - Merchant Rewards: 1% cashback for accepting SPARK
 * - Instant: No staking locks, instant transfers
 * - Cashback: Users earn 0.05% back on every purchase
 *
 * Unique Features:
 * - Dynamic fee reduction based on 30-day volume
 * - Merchant loyalty program with tiered rewards
 * - Batch transfers (send to multiple recipients in one tx)
 * - Subscription payments (recurring approvals)
 * - Flash cashback (instant reward on every tx)
 */
contract SparkCoin is ERC20, ERC20Permit, Ownable, ReentrancyGuard {
    
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 10_000_000_000 * 10**18;
    uint256 public constant BASE_FEE_RATE = 10; // 0.1%
    uint256 public constant CASHBACK_RATE = 5; // 0.05% to buyer
    uint256 public constant MERCHANT_REWARD_RATE = 100; // 1% merchant reward
    uint256 public constant DENOMINATOR = 10000;
    
    // Volume tiers for fee reduction (30-day rolling window)
    uint256[] public VOLUME_TIERS = [
        0,
        10000 * 10**18,    // $10k
        100000 * 10**18,   // $100k
        1000000 * 10**18,  // $1M
        10000000 * 10**18  // $10M
    ];
    uint256[] public FEE_REDUCTIONS = [0, 25, 50, 75, 90]; // % reduction
    
    // ============ Merchant System ============
    struct Merchant {
        bool registered;
        uint256 tier; // 0-3 (bronze, silver, gold, platinum)
        uint256 totalVolume;
        uint256 rewardPoints;
        uint256 joinTime;
    }
    
    mapping(address => Merchant) public merchants;
    mapping(address => uint256) public user30DayVolume;
    mapping(address => uint256) public userVolumeTimestamp;
    
    // ============ Subscriptions ============
    struct Subscription {
        address merchant;
        uint256 amount;
        uint256 interval; // seconds between payments
        uint256 nextPayment;
        uint256 maxPayments;
        uint256 paymentsMade;
        bool active;
    }
    
    mapping(address => mapping(uint256 => Subscription)) public subscriptions;
    mapping(address => uint256) public subscriptionCount;
    
    // ============ Batch Transfer ============
    uint256 public constant MAX_BATCH_SIZE = 100;
    
    // ============ Treasury ============
    address public treasury;
    address public merchantRewardsPool;
    
    // ============ Events ============
    event MerchantRegistered(address indexed merchant, uint256 tier);
    event MerchantTierUpgraded(address indexed merchant, uint256 newTier);
    event CashbackIssued(address indexed buyer, uint256 amount, uint256 transactionValue);
    event MerchantRewardIssued(address indexed merchant, uint256 amount, uint256 transactionValue);
    event SubscriptionCreated(address indexed subscriber, uint256 indexed subId, address merchant, uint256 amount);
    event SubscriptionPaid(address indexed subscriber, uint256 indexed subId, uint256 paymentNumber);
    event SubscriptionCanceled(address indexed subscriber, uint256 indexed subId);
    event BatchTransfer(address indexed sender, uint256 recipientCount, uint256 totalAmount);
    event FeeReduced(address indexed user, uint256 originalFee, uint256 reducedFee, uint256 tier);
    
    // ============ Constructor ============
    constructor(
        address _treasury,
        address _merchantPool
    ) ERC20("SparkCoin", "SPARK") ERC20Permit("SparkCoin") Ownable(msg.sender) {
        require(_treasury != address(0) && _merchantPool != address(0), "Zero address");
        
        treasury = _treasury;
        merchantRewardsPool = _merchantPool;
        
        // Distribution:
        // 40% Public sale / liquidity
        _mint(_treasury, (MAX_SUPPLY * 4000) / DENOMINATOR);
        
        // 25% Merchant adoption rewards
        _mint(_merchantPool, (MAX_SUPPLY * 2500) / DENOMINATOR);
        
        // 20% Ecosystem incentives ( cashback, rewards)
        _mint(_treasury, (MAX_SUPPLY * 2000) / DENOMINATOR);
        
        // 10% Team (vested via treasury)
        _mint(_treasury, (MAX_SUPPLY * 1000) / DENOMINATOR);
        
        // 5% Community airdrops
        _mint(_treasury, (MAX_SUPPLY * 500) / DENOMINATOR);
    }
    
    // ============ Dynamic Fee System ============
    
    /**
     * @notice Calculate transfer fee based on user's 30-day volume
     * @param amount Transfer amount
     * @param user The user paying the fee (sender)
     */
    function calculateFee(uint256 amount, address user) public view returns (uint256 fee, uint256 cashback, uint256 merchantReward) {
        // Clean old volume data
        uint256 effectiveVolume = user30DayVolume[user];
        if (block.timestamp > userVolumeTimestamp[user] + 30 days) {
            effectiveVolume = 0;
        }
        
        // Find volume tier
        uint256 reduction = 0;
        for (uint256 i = VOLUME_TIERS.length; i > 0; i--) {
            if (effectiveVolume >= VOLUME_TIERS[i - 1]) {
                reduction = FEE_REDUCTIONS[i - 1];
                break;
            }
        }
        
        uint256 baseFee = (amount * BASE_FEE_RATE) / DENOMINATOR;
        fee = baseFee - ((baseFee * reduction) / 100);
        
        cashback = (amount * CASHBACK_RATE) / DENOMINATOR;
        merchantReward = (amount * MERCHANT_REWARD_RATE) / DENOMINATOR;
        
        return (fee, cashback, merchantReward);
    }
    
    /**
     * @notice Get current fee tier for a user
     */
    function getUserFeeTier(address user) external view returns (uint256 tier, uint256 reductionPercent) {
        uint256 volume = user30DayVolume[user];
        if (block.timestamp > userVolumeTimestamp[user] + 30 days) {
            volume = 0;
        }
        
        for (uint256 i = VOLUME_TIERS.length; i > 0; i--) {
            if (volume >= VOLUME_TIERS[i - 1]) {
                return (i - 1, FEE_REDUCTIONS[i - 1]);
            }
        }
        return (0, 0);
    }
    
    // ============ Merchant System ============
    
    function registerMerchant(uint256 initialTier) external {
        require(initialTier <= 3, "Invalid tier");
        require(!merchants[msg.sender].registered, "Already registered");
        
        merchants[msg.sender] = Merchant({
            registered: true,
            tier: initialTier,
            totalVolume: 0,
            rewardPoints: 0,
            joinTime: block.timestamp
        });
        
        emit MerchantRegistered(msg.sender, initialTier);
    }
    
    function upgradeMerchantTier(uint256 newTier) external {
        require(merchants[msg.sender].registered, "Not a merchant");
        require(newTier > merchants[msg.sender].tier && newTier <= 3, "Invalid upgrade");
        
        // Tier requirements:
        // Silver (1): $10k volume
        // Gold (2): $100k volume
        // Platinum (3): $1M volume
        uint256[] memory tierRequirements = new uint256[](4);
        tierRequirements[0] = 0;
        tierRequirements[1] = 10000 * 10**18;
        tierRequirements[2] = 100000 * 10**18;
        tierRequirements[3] = 1000000 * 10**18;
        
        require(
            merchants[msg.sender].totalVolume >= tierRequirements[newTier],
            "Insufficient volume"
        );
        
        merchants[msg.sender].tier = newTier;
        emit MerchantTierUpgraded(msg.sender, newTier);
    }
    
    function getMerchantTierMultiplier(address merchant) public view returns (uint256) {
        if (!merchants[merchant].registered) return 100; // 1x base
        
        // Tier multipliers: Bronze 1x, Silver 1.5x, Gold 2x, Platinum 3x
        uint256[] memory multipliers = new uint256[](4);
        multipliers[0] = 100;
        multipliers[1] = 150;
        multipliers[2] = 200;
        multipliers[3] = 300;
        
        return multipliers[merchants[merchant].tier];
    }
    
    // ============ Batch Transfer ============
    
    /**
     * @notice Send tokens to multiple recipients in a single transaction
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts (must match recipients length)
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external returns (uint256 totalAmount, uint256 totalFee) {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length > 0 && recipients.length <= MAX_BATCH_SIZE, "Invalid batch size");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Zero address in batch");
            
            (uint256 fee, uint256 cashback, uint256 merchantReward) = calculateFee(amounts[i], msg.sender);
            uint256 netAmount = amounts[i] - fee;
            
            totalAmount += amounts[i];
            totalFee += fee;
            
            // Process fee distribution
            _processFeeDistribution(fee, cashback, merchantReward, recipients[i], msg.sender);
            
            _transfer(msg.sender, recipients[i], netAmount);
        }
        
        _updateVolume(msg.sender, totalAmount);
        
        emit BatchTransfer(msg.sender, recipients.length, totalAmount);
        return (totalAmount, totalFee);
    }
    
    // ============ Subscriptions ============
    
    function createSubscription(
        address merchant,
        uint256 amount,
        uint256 interval,
        uint256 maxPayments
    ) external returns (uint256 subId) {
        require(merchant != address(0), "Zero address");
        require(amount > 0 && interval > 0 && maxPayments > 0, "Invalid params");
        require(merchants[merchant].registered || merchant == treasury, "Unregistered merchant");
        
        subId = subscriptionCount[msg.sender]++;
        subscriptions[msg.sender][subId] = Subscription({
            merchant: merchant,
            amount: amount,
            interval: interval,
            nextPayment: block.timestamp + interval,
            maxPayments: maxPayments,
            paymentsMade: 0,
            active: true
        });
        
        emit SubscriptionCreated(msg.sender, subId, merchant, amount);
        return subId;
    }
    
    function processSubscription(address subscriber, uint256 subId) external nonReentrant {
        Subscription storage sub = subscriptions[subscriber][subId];
        require(sub.active, "Inactive");
        require(block.timestamp >= sub.nextPayment, "Too early");
        require(sub.paymentsMade < sub.maxPayments, "Completed");
        require(balanceOf(subscriber) >= sub.amount, "Insufficient balance");
        
        sub.paymentsMade++;
        sub.nextPayment = block.timestamp + sub.interval;
        
        if (sub.paymentsMade >= sub.maxPayments) {
            sub.active = false;
        }
        
        _transfer(subscriber, sub.merchant, sub.amount);
        
        // Update merchant volume
        if (merchants[sub.merchant].registered) {
            merchants[sub.merchant].totalVolume += sub.amount;
        }
        
        emit SubscriptionPaid(subscriber, subId, sub.paymentsMade);
    }
    
    function cancelSubscription(uint256 subId) external {
        Subscription storage sub = subscriptions[msg.sender][subId];
        require(sub.active, "Inactive");
        
        sub.active = false;
        emit SubscriptionCanceled(msg.sender, subId);
    }
    
    // ============ Internal Fee Processing ============
    
    function _processFeeDistribution(
        uint256 fee,
        uint256 cashback,
        uint256 merchantReward,
        address recipient,
        address sender
    ) internal {
        // Send fee to treasury
        _transfer(sender, treasury, fee);
        
        // Issue cashback to buyer (from treasury)
        if (cashback > 0) {
            _transfer(treasury, sender, cashback);
            emit CashbackIssued(sender, cashback, fee * DENOMINATOR / BASE_FEE_RATE);
        }
        
        // Issue merchant reward if recipient is registered merchant
        if (merchants[recipient].registered && merchantReward > 0) {
            uint256 multiplier = getMerchantTierMultiplier(recipient);
            uint256 boostedReward = (merchantReward * multiplier) / 100;
            
            _transfer(merchantRewardsPool, recipient, boostedReward);
            merchants[recipient].totalVolume += fee * DENOMINATOR / BASE_FEE_RATE;
            merchants[recipient].rewardPoints += boostedReward;
            
            emit MerchantRewardIssued(recipient, boostedReward, fee * DENOMINATOR / BASE_FEE_RATE);
        }
    }
    
    function _updateVolume(address user, uint256 amount) internal {
        if (block.timestamp > userVolumeTimestamp[user] + 30 days) {
            user30DayVolume[user] = 0;
        }
        user30DayVolume[user] += amount;
        userVolumeTimestamp[user] = block.timestamp;
    }
    
    // ============ Transfer Override ============
    
    function _update(address from, address to, uint256 amount) internal virtual override {
        // Skip fee logic on mints/burns and contract interactions
        if (from == address(0) || to == address(0) || 
            from == treasury || to == treasury ||
            from == merchantRewardsPool || to == merchantRewardsPool) {
            super._update(from, to, amount);
            return;
        }
        
        (uint256 fee, uint256 cashback, uint256 merchantReward) = calculateFee(amount, from);
        
        uint256 netAmount = amount - fee;
        
        // Transfer net amount
        super._update(from, to, netAmount);
        
        // Process fee if any
        if (fee > 0) {
            _processFeeDistribution(fee, cashback, merchantReward, to, from);
        }
        
        // Update sender's volume
        _updateVolume(from, amount);
    }
    
    // ============ Admin ============
    
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
    }
    
    function setMerchantRewardsPool(address _pool) external onlyOwner {
        require(_pool != address(0), "Zero address");
        merchantRewardsPool = _pool;
    }
    
    function distributeAirdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(treasury, recipients[i], amounts[i]);
        }
    }
}
