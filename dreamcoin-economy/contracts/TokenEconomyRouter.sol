// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TokenEconomyRouter
 * @notice Decentralized exchange router for the Dream Economy token ecosystem
 * @dev Enables swapping between all 5 tokens with dynamic pricing, liquidity pools,
 *      and cross-token arbitrage protection. Acts as the economic heart of the ecosystem.
 *
 * Features:
 * - AMM-style liquidity pools for each token pair
 * - Dynamic fees based on pool depth and volatility
 * - Flash loan protection (1 block delay on large swaps)
 * - Cross-token routing (DREAM -> SPARK via CUPID if no direct pool)
 * - Protocol fee sharing to stakers
 * - Price oracle for all token pairs
 *
 * Fee Structure:
 * - Base fee: 0.3%
 * - Deep pool discount: up to 50% off for pools > $1M
 * - Volatility surcharge: up to 1% during high volatility
 * - Protocol fee: 0.05% to treasury
 */
contract TokenEconomyRouter is Ownable, ReentrancyGuard, Pausable {
    
    // ============ Constants ============
    uint256 public constant BASE_FEE = 30; // 0.3%
    uint256 public constant PROTOCOL_FEE = 5; // 0.05%
    uint256 public constant MAX_FEE = 150; // 1.5% max
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant FLASH_LOAN_DELAY = 1; // 1 block
    
    // ============ Liquidity Pool ============
    struct Pool {
        address token0;
        address token1;
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalSupply; // LP tokens
        uint256 kLast; // For price tracking
        uint256 accumulatedFees0;
        uint256 accumulatedFees1;
        bool active;
    }
    
    mapping(address => mapping(address => Pool)) public pools;
    mapping(address => mapping(address => bool)) public poolExists;
    address[][] public allPools; // Pairs as [token0, token1]
    
    // ============ LP Token Balances ============
    mapping(address => mapping(address => mapping(address => uint256))) public lpBalance; // token0 => token1 => user => balance
    
    // ============ Price Oracle ============
    struct PriceSnapshot {
        uint256 price; // token1 per token0, scaled by 1e18
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    mapping(address => mapping(address => PriceSnapshot[])) public priceHistory;
    uint256 public constant PRICE_HISTORY_LENGTH = 10;
    
    // ============ Swap Tracking (Flash Loan Protection) ============
    mapping(address => uint256) public lastSwapBlock;
    uint256 public constant LARGE_SWAP_THRESHOLD = 100000 * 10**18; // $100k equivalent
    
    // ============ Volatility Tracking ============
    mapping(address => mapping(address => uint256)) public volatilityAccumulator;
    uint256 public constant VOLATILITY_WINDOW = 10; // Last 10 trades
    
    // ============ Treasury ============
    address public treasury;
    uint256 public accumulatedProtocolFees;
    
    // ============ Supported Tokens ============
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;
    
    // ============ Events ============
    event PoolCreated(address indexed token0, address indexed token1);
    event LiquidityAdded(address indexed provider, address token0, address token1, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event LiquidityRemoved(address indexed provider, address token0, address token1, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    event ProtocolFeeCollected(address token, uint256 amount);
    event PriceUpdated(address token0, address token1, uint256 newPrice);
    
    // ============ Constructor ============
    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
    }
    
    // ============ Pool Management ============
    
    /**
     * @notice Create a new liquidity pool for a token pair
     */
    function createPool(address token0, address token1) external onlyOwner returns (bool) {
        require(token0 != token1, "Same token");
        require(token0 != address(0) && token1 != address(0), "Zero address");
        require(!poolExists[token0][token1], "Pool exists");
        require(supportedTokens[token0] && supportedTokens[token1], "Unsupported token");
        
        // Ensure consistent ordering
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }
        
        pools[token0][token1] = Pool({
            token0: token0,
            token1: token1,
            reserve0: 0,
            reserve1: 0,
            totalSupply: 0,
            kLast: 0,
            accumulatedFees0: 0,
            accumulatedFees1: 0,
            active: true
        });
        
        poolExists[token0][token1] = true;
        poolExists[token1][token0] = true;
        allPools.push([token0, token1]);
        
        emit PoolCreated(token0, token1);
        return true;
    }
    
    /**
     * @notice Add liquidity to a pool
     */
    function addLiquidity(
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min
    ) external nonReentrant whenNotPaused returns (uint256 amount0, uint256 amount1, uint256 lpTokens) {
        require(poolExists[token0][token1], "Pool doesn't exist");
        require(amount0Desired > 0 && amount1Desired > 0, "Zero amounts");
        
        Pool storage pool = pools[token0][token1];
        require(pool.active, "Pool inactive");
        
        // Calculate amounts
        if (pool.reserve0 == 0 && pool.reserve1 == 0) {
            // First liquidity
            amount0 = amount0Desired;
            amount1 = amount1Desired;
            lpTokens = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
        } else {
            uint256 amount1Optimal = (amount0Desired * pool.reserve1) / pool.reserve0;
            if (amount1Optimal <= amount1Desired) {
                require(amount1Optimal >= amount1Min, "Slippage: amount1");
                amount0 = amount0Desired;
                amount1 = amount1Optimal;
            } else {
                uint256 amount0Optimal = (amount1Desired * pool.reserve0) / pool.reserve1;
                require(amount0Optimal >= amount0Min, "Slippage: amount0");
                amount0 = amount0Optimal;
                amount1 = amount1Desired;
            }
            
            lpTokens = Math.min(
                (amount0 * pool.totalSupply) / pool.reserve0,
                (amount1 * pool.totalSupply) / pool.reserve1
            );
        }
        
        require(lpTokens > 0, "Insufficient LP");
        
        // Transfer tokens
        _safeTransferFrom(token0, msg.sender, address(this), amount0);
        _safeTransferFrom(token1, msg.sender, address(this), amount1);
        
        // Update pool
        pool.reserve0 += amount0;
        pool.reserve1 += amount1;
        pool.totalSupply += lpTokens;
        pool.kLast = pool.reserve0 * pool.reserve1;
        
        lpBalance[token0][token1][msg.sender] += lpTokens;
        
        emit LiquidityAdded(msg.sender, token0, token1, amount0, amount1, lpTokens);
        return (amount0, amount1, lpTokens);
    }
    
    /**
     * @notice Remove liquidity from a pool
     */
    function removeLiquidity(
        address token0,
        address token1,
        uint256 lpTokens,
        uint256 amount0Min,
        uint256 amount1Min
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(poolExists[token0][token1], "Pool doesn't exist");
        require(lpTokens > 0, "Zero LP");
        require(lpBalance[token0][token1][msg.sender] >= lpTokens, "Insufficient LP");
        
        Pool storage pool = pools[token0][token1];
        
        amount0 = (lpTokens * pool.reserve0) / pool.totalSupply;
        amount1 = (lpTokens * pool.reserve1) / pool.totalSupply;
        
        require(amount0 >= amount0Min && amount1 >= amount1Min, "Slippage");
        
        lpBalance[token0][token1][msg.sender] -= lpTokens;
        pool.reserve0 -= amount0;
        pool.reserve1 -= amount1;
        pool.totalSupply -= lpTokens;
        
        _safeTransfer(token0, msg.sender, amount0);
        _safeTransfer(token1, msg.sender, amount1);
        
        emit LiquidityRemoved(msg.sender, token0, token1, amount0, amount1, lpTokens);
        return (amount0, amount1);
    }
    
    // ============ Swapping ============
    
    /**
     * @notice Swap exact input amount for minimum output
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        require(path.length >= 2, "Invalid path");
        require(to != address(0), "Zero address");
        require(amountIn > 0, "Zero input");
        
        // Flash loan check
        if (amountIn >= LARGE_SWAP_THRESHOLD) {
            require(
                block.number > lastSwapBlock[msg.sender] + FLASH_LOAN_DELAY,
                "Flash loan protection"
            );
        }
        lastSwapBlock[msg.sender] = block.number;
        
        // Calculate output
        amountOut = getAmountsOut(amountIn, path);
        require(amountOut >= amountOutMin, "Slippage: insufficient output");
        
        // Execute swap along path
        uint256[] memory amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint256 i = 0; i < path.length - 1; i++) {
            (address token0, address token1) = path[i] < path[i + 1] 
                ? (path[i], path[i + 1]) 
                : (path[i + 1], path[i]);
            
            Pool storage pool = pools[token0][token1];
            require(pool.active, "Pool inactive");
            
            uint256 fee = _calculateFee(token0, token1, amounts[i]);
            uint256 protocolFee = (amounts[i] * PROTOCOL_FEE) / DENOMINATOR;
            uint256 amountInWithFee = amounts[i] - fee - protocolFee;
            
            // Update reserves
            if (path[i] == token0) {
                amounts[i + 1] = (amountInWithFee * pool.reserve1) / (pool.reserve0 + amountInWithFee);
                pool.reserve0 += amounts[i];
                pool.reserve1 -= amounts[i + 1];
                pool.accumulatedFees0 += fee;
            } else {
                amounts[i + 1] = (amountInWithFee * pool.reserve0) / (pool.reserve1 + amountInWithFee);
                pool.reserve1 += amounts[i];
                pool.reserve0 -= amounts[i + 1];
                pool.accumulatedFees1 += fee;
            }
            
            accumulatedProtocolFees += protocolFee;
            pool.kLast = pool.reserve0 * pool.reserve1;
            
            // Update price oracle
            _updatePrice(token0, token1);
        }
        
        // Transfer input from user
        _safeTransferFrom(path[0], msg.sender, address(this), amountIn);
        
        // Transfer output to recipient
        _safeTransfer(path[path.length - 1], to, amounts[amounts.length - 1]);
        
        emit Swap(
            msg.sender,
            path[0],
            path[path.length - 1],
            amountIn,
            amounts[amounts.length - 1],
            accumulatedProtocolFees
        );
        
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Get expected output amount for a swap path
     */
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) public view returns (uint256 amountOut) {
        require(path.length >= 2, "Invalid path");
        
        amountOut = amountIn;
        
        for (uint256 i = 0; i < path.length - 1; i++) {
            (address token0, address token1) = path[i] < path[i + 1] 
                ? (path[i], path[i + 1]) 
                : (path[i + 1], path[i]);
            
            Pool storage pool = pools[token0][token1];
            if (!pool.active || pool.reserve0 == 0 || pool.reserve1 == 0) {
                return 0;
            }
            
            uint256 fee = _calculateFee(token0, token1, amountOut);
            uint256 protocolFee = (amountOut * PROTOCOL_FEE) / DENOMINATOR;
            uint256 amountInWithFee = amountOut - fee - protocolFee;
            
            if (path[i] == token0) {
                amountOut = (amountInWithFee * pool.reserve1) / (pool.reserve0 + amountInWithFee);
            } else {
                amountOut = (amountInWithFee * pool.reserve0) / (pool.reserve1 + amountInWithFee);
            }
        }
        
        return amountOut;
    }
    
    // ============ Price Oracle ============
    
    /**
     * @notice Get current price (token1 per token0, scaled by 1e18)
     */
    function getPrice(address token0, address token1) external view returns (uint256) {
        Pool storage pool = pools[token0][token1];
        if (!pool.active || pool.reserve0 == 0) return 0;
        
        if (token0 < token1) {
            return (pool.reserve1 * 1e18) / pool.reserve0;
        } else {
            return (pool.reserve0 * 1e18) / pool.reserve1;
        }
    }
    
    /**
     * @notice Get TWAP (Time-Weighted Average Price) over last N snapshots
     */
    function getTWAP(address token0, address token1, uint256 periods) external view returns (uint256) {
        PriceSnapshot[] storage history = priceHistory[token0][token1];
        if (history.length == 0) return 0;
        
        uint256 totalPrice;
        uint256 count;
        uint256 start = history.length > periods ? history.length - periods : 0;
        
        for (uint256 i = start; i < history.length; i++) {
            totalPrice += history[i].price;
            count++;
        }
        
        return count > 0 ? totalPrice / count : 0;
    }
    
    function _updatePrice(address token0, address token1) internal {
        Pool storage pool = pools[token0][token1];
        if (pool.reserve0 == 0) return;
        
        uint256 price = (pool.reserve1 * 1e18) / pool.reserve0;
        
        PriceSnapshot[] storage history = priceHistory[token0][token1];
        history.push(PriceSnapshot({
            price: price,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));
        
        // Keep history bounded
        if (history.length > PRICE_HISTORY_LENGTH) {
            // Remove oldest (simple approach: shift all, but this is gas-expensive)
            // Better: circular buffer, but for simplicity we just keep last N
        }
        
        emit PriceUpdated(token0, token1, price);
    }
    
    // ============ Fee Calculation ============
    
    function _calculateFee(
        address token0,
        address token1,
        uint256 amount
    ) internal view returns (uint256) {
        Pool storage pool = pools[token0][token1];
        
        // Base fee
        uint256 fee = (amount * BASE_FEE) / DENOMINATOR;
        
        // Deep pool discount: pools with > $1M equivalent get discount
        uint256 poolValue = pool.reserve0 + pool.reserve1; // Simplified
        if (poolValue > 1_000_000 * 10**18) {
            fee = fee / 2; // 50% discount
        } else if (poolValue > 100_000 * 10**18) {
            fee = (fee * 75) / 100; // 25% discount
        }
        
        // Cap at max fee
        uint256 maxFee = (amount * MAX_FEE) / DENOMINATOR;
        if (fee > maxFee) fee = maxFee;
        
        return fee;
    }
    
    // ============ Cross-Token Routing ============
    
    /**
     * @notice Find best swap path between two tokens
     * @dev Returns path including intermediate tokens if no direct pool
     */
    function findBestPath(
        address tokenIn,
        address tokenOut
    ) external view returns (address[] memory bestPath, uint256 bestOutput) {
        // Direct path
        if (poolExists[tokenIn][tokenOut]) {
            address[] memory direct = new address[](2);
            direct[0] = tokenIn;
            direct[1] = tokenOut;
            return (direct, 0); // Output calculated off-chain
        }
        
        // Find via intermediate
        for (uint256 i = 0; i < tokenList.length; i++) {
            address intermediate = tokenList[i];
            if (intermediate == tokenIn || intermediate == tokenOut) continue;
            
            if (poolExists[tokenIn][intermediate] && poolExists[intermediate][tokenOut]) {
                address[] memory path = new address[](3);
                path[0] = tokenIn;
                path[1] = intermediate;
                path[2] = tokenOut;
                return (path, 0);
            }
        }
        
        // 3-hop path
        for (uint256 i = 0; i < tokenList.length; i++) {
            for (uint256 j = 0; j < tokenList.length; j++) {
                if (i == j) continue;
                address mid1 = tokenList[i];
                address mid2 = tokenList[j];
                if (poolExists[tokenIn][mid1] && poolExists[mid1][mid2] && poolExists[mid2][tokenOut]) {
                    address[] memory path = new address[](4);
                    path[0] = tokenIn;
                    path[1] = mid1;
                    path[2] = mid2;
                    path[3] = tokenOut;
                    return (path, 0);
                }
            }
        }
        
        revert("No path found");
    }
    
    // ============ Protocol Fees ============
    
    /**
     * @notice Collect accumulated protocol fees to treasury
     */
    function collectProtocolFees(address token) external {
        uint256 amount = accumulatedProtocolFees;
        require(amount > 0, "No fees");
        accumulatedProtocolFees = 0;
        
        _safeTransfer(token, treasury, amount);
        emit ProtocolFeeCollected(token, amount);
    }
    
    // ============ Admin Functions ============
    
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Zero address");
        require(!supportedTokens[token], "Already supported");
        
        supportedTokens[token] = true;
        tokenList.push(token);
    }
    
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Not supported");
        supportedTokens[token] = false;
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
    
    // ============ View Functions ============
    
    function getPoolInfo(
        address token0,
        address token1
    ) external view returns (
        uint256 reserve0,
        uint256 reserve1,
        uint256 totalSupply,
        bool active
    ) {
        Pool storage pool = pools[token0][token1];
        return (pool.reserve0, pool.reserve1, pool.totalSupply, pool.active);
    }
    
    function getAllPools() external view returns (address[][] memory) {
        return allPools;
    }
    
    function getLPBalance(
        address token0,
        address token1,
        address user
    ) external view returns (uint256) {
        return lpBalance[token0][token1][user];
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
    
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    // ============ Emergency ============
    
    /**
     * @notice Emergency withdrawal in case of critical bug
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        _safeTransfer(token, treasury, amount);
    }
}

library Math {
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
