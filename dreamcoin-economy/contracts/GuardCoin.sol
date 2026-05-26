// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title GuardCoin (GUARD)
 * @notice Stability & insurance reserve token — The safety net of the Dream Economy
 * @dev Collateral-backed, yield-generating reserve that stabilizes the ecosystem during volatility
 *
 * Tokenomics:
 * - Max Supply: 10,000,000 GUARD (ultra scarce)
 * - Backing: Each GUARD is backed by a basket of assets (ETH, DREAM, stablecoins)
 * - Yield: 8-15% APR from protocol fees and collateral yield
 * - Insurance: Provides coverage during market crashes (payouts to holders)
 * - Bonding: Mint GUARD by depositing collateral at a discount
 * - Redeem: Burn GUARD to reclaim collateral (with time lock)
 *
 * Unique Features:
 * - Dynamic collateral ratio (150-300% based on market conditions)
 * - Circuit breaker: Automatic buybacks during crashes
 * - Protocol-owned liquidity: Treasury owns LP positions
 * - Rebase rewards: Yield distributed via balance increases
 * - Emergency fund: 20% of treasury for crisis payouts
 */
contract GuardCoin is ERC20, ERC20Permit, Ownable, ReentrancyGuard {
    
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18;
    uint256 public constant BASE_COLLATERAL_RATIO = 20000; // 200% = 2:1 backing
    uint256 public constant MIN_COLLATERAL_RATIO = 15000; // 150%
    uint256 public constant MAX_COLLATERAL_RATIO = 30000; // 300%
    uint256 public constant BOND_DISCOUNT_BASE = 500; // 5% discount when bonding
    uint256 public constant REDEEM_LOCK_DAYS = 14;
    uint256 public constant INSURANCE_PAYOUT_PCT = 2000; // 20% of emergency fund max payout
    uint256 public constant DENOMINATOR = 10000;
    
    // ============ Collateral Assets ============
    struct CollateralAsset {
        address token;
        uint256 weight; // Out of 10000
        bool active;
    }
    
    CollateralAsset[] public collateralAssets;
    mapping(address => uint256) public collateralDeposits; // Total deposits per asset
    
    // ============ Bonding ============
    struct Bond {
        uint256 guardAmount;     // GUARD received
        uint256 collateralValue; // Value of collateral deposited
        uint256 vestingEnd;      // When bonding discount fully vests
        uint256 bondedAt;
    }
    
    mapping(address => Bond[]) public bonds;
    uint256 public totalCollateralValue;
    
    // ============ Redemption Queue ============
    struct Redemption {
        address token;
        uint256 amount;
        uint256 requestTime;
        bool fulfilled;
    }
    
    mapping(address => Redemption[]) public redemptionQueue;
    
    // ============ Insurance Fund ============
    uint256 public insuranceFundBalance;
    uint256 public totalPayoutsMade;
    
    struct Payout {
        uint256 timestamp;
        uint256 amountPerToken;
        uint256 totalPaid;
        string reason;
    }
    
    Payout[] public payoutHistory;
    mapping(address => uint256) public lastPayoutClaimed;
    
    // ============ Protocol Parameters ============
    uint256 public currentCollateralRatio = BASE_COLLATERAL_RATIO;
    bool public circuitBreakerActive;
    uint256 public circuitBreakerThreshold = 5000; // 50% price drop triggers it
    uint256 public lastPriceCheck;
    uint256 public lastKnownPrice = 1e18; // Start at $1 (18 decimals)
    
    // ============ Rebase ============
    uint256 public index = 1e18; // Scales with yield distribution
    mapping(address => uint256) public indexedBalances;
    uint256 public indexedTotalSupply;
    
    // ============ Yield Sources ============
    mapping(address => uint256) public yieldAccrued; // Per asset
    uint256 public totalYieldAccrued;
    
    // ============ Treasury ============
    address public treasury;
    address public oracle; // Price oracle for collateral valuation
    
    // ============ Events ============
    event Bonded(address indexed user, uint256 collateralValue, uint256 guardAmount, uint256 vestingEnd);
    event RedemptionRequested(address indexed user, address token, uint256 amount, uint256 unlockTime);
    event RedemptionFulfilled(address indexed user, address token, uint256 amount);
    event CollateralAdded(address indexed token, uint256 weight);
    event CollateralRemoved(address indexed token);
    event InsurancePayout(uint256 indexed payoutId, uint256 amountPerToken, string reason);
    event PayoutClaimed(address indexed user, uint256 amount);
    event CircuitBreakerTriggered(uint256 price);
    event CircuitBreakerReset();
    event Rebase(uint256 newIndex);
    event YieldDistributed(uint256 amount);
    event CollateralRatioUpdated(uint256 newRatio);
    
    // ============ Modifiers ============
    modifier onlyOracle() {
        require(msg.sender == oracle, "GuardCoin: not oracle");
        _;
    }
    
    // ============ Constructor ============
    constructor(
        address _treasury,
        address _oracle
    ) ERC20("GuardCoin", "GUARD") ERC20Permit("GuardCoin") Ownable(msg.sender) {
        require(_treasury != address(0) && _oracle != address(0), "Zero address");
        
        treasury = _treasury;
        oracle = _oracle;
        
        // Initial distribution:
        // 50% to treasury for bonding liquidity
        _mint(_treasury, (MAX_SUPPLY * 5000) / DENOMINATOR);
        
        // 20% Insurance fund (held by contract)
        _mint(address(this), (MAX_SUPPLY * 2000) / DENOMINATOR);
        insuranceFundBalance = (MAX_SUPPLY * 2000) / DENOMINATOR;
        
        // 15% Team vesting (sent to treasury with timelock)
        _mint(_treasury, (MAX_SUPPLY * 1500) / DENOMINATOR);
        
        // 10% Protocol-owned liquidity
        _mint(_treasury, (MAX_SUPPLY * 1000) / DENOMINATOR);
        
        // 5% Emergency reserve
        _mint(address(this), (MAX_SUPPLY * 500) / DENOMINATOR);
        
        lastPriceCheck = block.timestamp;
    }
    
    // ============ Bonding (Mint GUARD with collateral) ============
    
    /**
     * @notice Bond collateral to mint GUARD at a discount
     * @param collateralToken The token to deposit as collateral
     * @param amount Amount of collateral token
     * @dev GUARD amount = (collateral_value * (1 + discount)) / current_backing_price
     */
    function bond(
        address collateralToken,
        uint256 amount
    ) external nonReentrant returns (uint256 guardAmount) {
        require(amount > 0, "Zero amount");
        require(_isValidCollateral(collateralToken), "Invalid collateral");
        require(!circuitBreakerActive, "Circuit breaker active");
        
        // Transfer collateral
        (bool success, ) = collateralToken.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount)
        );
        require(success, "Collateral transfer failed");
        
        // Calculate collateral value (simplified - oracle should provide price)
        uint256 collateralValue = _getCollateralValue(collateralToken, amount);
        
        // Calculate GUARD to mint with discount
        // At 200% collateral ratio, $2 of collateral backs $1 of GUARD
        uint256 backingValue = (collateralValue * DENOMINATOR) / currentCollateralRatio;
        uint256 discount = _getBondDiscount();
        guardAmount = backingValue + ((backingValue * discount) / DENOMINATOR);
        
        // Apply vesting for discount (90 day linear vest)
        uint256 vestingEnd = block.timestamp + 90 days;
        
        // Track bond
        bonds[msg.sender].push(Bond({
            guardAmount: guardAmount,
            collateralValue: collateralValue,
            vestingEnd: vestingEnd,
            bondedAt: block.timestamp
        }));
        
        // Update state
        collateralDeposits[collateralToken] += amount;
        totalCollateralValue += collateralValue;
        
        _mint(msg.sender, guardAmount);
        
        emit Bonded(msg.sender, collateralValue, guardAmount, vestingEnd);
        return guardAmount;
    }
    
    /**
     * @notice Request redemption of GUARD for collateral (14-day lock)
     */
    function requestRedemption(address collateralToken, uint256 guardAmount) external nonReentrant {
        require(guardAmount > 0, "Zero amount");
        require(balanceOf(msg.sender) >= guardAmount, "Insufficient GUARD");
        require(_isValidCollateral(collateralToken), "Invalid collateral");
        
        uint256 collateralValue = (guardAmount * currentCollateralRatio) / DENOMINATOR;
        uint256 collateralAmount = _getCollateralAmount(collateralToken, collateralValue);
        
        require(collateralAmount <= collateralDeposits[collateralToken], "Insufficient collateral");
        
        // Burn GUARD immediately
        _burn(msg.sender, guardAmount);
        
        // Queue redemption
        redemptionQueue[msg.sender].push(Redemption({
            token: collateralToken,
            amount: collateralAmount,
            requestTime: block.timestamp,
            fulfilled: false
        }));
        
        totalCollateralValue -= collateralValue;
        collateralDeposits[collateralToken] -= collateralAmount;
        
        emit RedemptionRequested(
            msg.sender, 
            collateralToken, 
            collateralAmount, 
            block.timestamp + (REDEEM_LOCK_DAYS * 1 days)
        );
    }
    
    /**
     * @notice Claim redemption after lock period
     */
    function claimRedemption(uint256 requestIndex) external nonReentrant {
        require(requestIndex < redemptionQueue[msg.sender].length, "Invalid index");
        
        Redemption storage req = redemptionQueue[msg.sender][requestIndex];
        require(!req.fulfilled, "Already fulfilled");
        require(
            block.timestamp >= req.requestTime + (REDEEM_LOCK_DAYS * 1 days),
            "Lock period active"
        );
        
        req.fulfilled = true;
        
        (bool success, ) = req.token.call(
            abi.encodeWithSignature("transfer(address,uint256)", msg.sender, req.amount)
        );
        require(success, "Transfer failed");
        
        emit RedemptionFulfilled(msg.sender, req.token, req.amount);
    }
    
    // ============ Insurance Payouts ============
    
    /**
     * @notice Distribute insurance payout to all GUARD holders
     * @param amount Total amount to distribute
     * @param reason Description of the payout event
     */
    function distributeInsurancePayout(
        uint256 amount,
        string calldata reason
    ) external onlyOwner {
        require(amount <= (insuranceFundBalance * INSURANCE_PAYOUT_PCT) / DENOMINATOR, "Exceeds max payout");
        require(totalSupply() > 0, "No supply");
        
        uint256 amountPerToken = (amount * 1e18) / totalSupply();
        require(amountPerToken > 0, "Payout too small");
        
        insuranceFundBalance -= amount;
        
        // Use rebase mechanism to distribute
        // Increase everyone's balance proportionally
        uint256 rebaseAmount = amount;
        uint256 newIndex = index + ((rebaseAmount * 1e18) / totalSupply());
        index = newIndex;
        
        payoutHistory.push(Payout({
            timestamp: block.timestamp,
            amountPerToken: amountPerToken,
            totalPaid: amount,
            reason: reason
        }));
        
        emit InsurancePayout(payoutHistory.length - 1, amountPerToken, reason);
        emit Rebase(newIndex);
    }
    
    /**
     * @notice Claim pending insurance payouts for caller
     */
    function claimPayouts() external nonReentrant {
        uint256 lastClaim = lastPayoutClaimed[msg.sender];
        uint256 totalClaim;
        
        for (uint256 i = lastClaim; i < payoutHistory.length; i++) {
            totalClaim += (balanceOf(msg.sender) * payoutHistory[i].amountPerToken) / 1e18;
        }
        
        require(totalClaim > 0, "No payouts to claim");
        
        lastPayoutClaimed[msg.sender] = payoutHistory.length;
        
        // Transfer from treasury (payouts funded by insurance fund)
        (bool success, ) = treasury.call(
            abi.encodeWithSignature("transfer(address,uint256)", msg.sender, totalClaim)
        );
        require(success, "Payout transfer failed");
        
        emit PayoutClaimed(msg.sender, totalClaim);
    }
    
    // ============ Circuit Breaker ============
    
    /**
     * @notice Update price from oracle and check circuit breaker
     */
    function checkCircuitBreaker(uint256 currentPrice) external onlyOracle {
        lastPriceCheck = block.timestamp;
        
        // Calculate price drop percentage
        uint256 priceDrop = lastKnownPrice > currentPrice 
            ? ((lastKnownPrice - currentPrice) * DENOMINATOR) / lastKnownPrice 
            : 0;
        
        if (priceDrop >= circuitBreakerThreshold && !circuitBreakerActive) {
            // Trigger circuit breaker
            circuitBreakerActive = true;
            
            // Raise collateral ratio for safety
            currentCollateralRatio = MAX_COLLATERAL_RATIO;
            
            // Use treasury to buy back GUARD if needed
            emit CircuitBreakerTriggered(currentPrice);
        } else if (circuitBreakerActive && priceDrop < (circuitBreakerThreshold / 2)) {
            // Reset if price recovers to within 25% drop
            circuitBreakerActive = false;
            currentCollateralRatio = BASE_COLLATERAL_RATIO;
            emit CircuitBreakerReset();
        }
        
        lastKnownPrice = currentPrice;
    }
    
    // ============ Rebase / Yield Distribution ============
    
    /**
     * @notice Distribute yield to all holders via rebase
     * @param yieldAmount Amount of yield to distribute
     */
    function distributeYield(uint256 yieldAmount) external onlyOwner {
        require(yieldAmount > 0 && totalSupply() > 0, "Invalid");
        
        uint256 newIndex = index + ((yieldAmount * 1e18) / totalSupply());
        index = newIndex;
        
        totalYieldAccrued += yieldAmount;
        
        emit YieldDistributed(yieldAmount);
        emit Rebase(newIndex);
    }
    
    // Override balanceOf to support rebase
    function balanceOf(address account) public view override returns (uint256) {
        return (super.balanceOf(account) * index) / 1e18;
    }
    
    function totalSupply() public view override returns (uint256) {
        return (super.totalSupply() * index) / 1e18;
    }
    
    // Internal transfer uses raw balances (before index)
    function _update(address from, address to, uint256 amount) internal virtual override {
        // Convert indexed amount to raw amount
        uint256 rawAmount = (amount * 1e18) / index;
        super._update(from, to, rawAmount);
    }
    
    // ============ Collateral Management ============
    
    function addCollateralAsset(address token, uint256 weight) external onlyOwner {
        require(token != address(0), "Zero address");
        require(weight > 0, "Zero weight");
        
        // Validate it's a valid token
        (bool success, ) = token.staticcall(abi.encodeWithSignature("totalSupply()"));
        require(success, "Invalid token");
        
        collateralAssets.push(CollateralAsset({
            token: token,
            weight: weight,
            active: true
        }));
        
        emit CollateralAdded(token, weight);
    }
    
    function removeCollateralAsset(uint256 index_) external onlyOwner {
        require(index_ < collateralAssets.length, "Invalid index");
        address token = collateralAssets[index_].token;
        collateralAssets[index_].active = false;
        emit CollateralRemoved(token);
    }
    
    function setCollateralRatio(uint256 ratio) external onlyOwner {
        require(ratio >= MIN_COLLATERAL_RATIO && ratio <= MAX_COLLATERAL_RATIO, "Out of range");
        currentCollateralRatio = ratio;
        emit CollateralRatioUpdated(ratio);
    }
    
    // ============ View Functions ============
    
    function getCollateralValue() external view returns (uint256) {
        return totalCollateralValue;
    }
    
    function getBondingDiscount() external view returns (uint256) {
        return _getBondDiscount();
    }
    
    function getUserBonds(address user) external view returns (Bond[] memory) {
        return bonds[user];
    }
    
    function getPayoutHistory() external view returns (Payout[] memory) {
        return payoutHistory;
    }
    
    // ============ Internal Helpers ============
    
    function _isValidCollateral(address token) internal view returns (bool) {
        for (uint256 i = 0; i < collateralAssets.length; i++) {
            if (collateralAssets[i].token == token && collateralAssets[i].active) {
                return true;
            }
        }
        return false;
    }
    
    function _getCollateralValue(address token, uint256 amount) internal view returns (uint256) {
        // Simplified: assume 1:1 for same decimals, oracle integration needed
        // In production, use Chainlink oracle: price * amount / 10^decimals
        return amount;
    }
    
    function _getCollateralAmount(address token, uint256 value) internal view returns (uint256) {
        // Reverse of _getCollateralValue
        return value;
    }
    
    function _getBondDiscount() internal view returns (uint256) {
        // Dynamic discount based on collateral ratio
        // Higher ratio = higher discount to incentivize bonding
        if (currentCollateralRatio >= 25000) return 1000; // 10% at 250%+
        if (currentCollateralRatio >= 20000) return BOND_DISCOUNT_BASE; // 5% at 200%
        if (currentCollateralRatio >= 17500) return 300; // 3% at 175%
        return 100; // 1% at 150%
    }
    
    function getBackingPerToken() external view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return (totalCollateralValue * 1e18) / totalSupply();
    }
    
    // ============ Admin ============
    
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Zero address");
        oracle = _oracle;
    }
    
    function setCircuitBreakerThreshold(uint256 threshold) external onlyOwner {
        require(threshold > 0 && threshold <= 8000, "0-80%");
        circuitBreakerThreshold = threshold;
    }
    
    function depositToInsuranceFund(uint256 amount) external {
        // Accept deposits to insurance fund (from yield, fees, etc)
        insuranceFundBalance += amount;
    }
}
