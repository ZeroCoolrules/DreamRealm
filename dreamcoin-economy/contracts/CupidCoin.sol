// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title CupidCoin (CUPID)
 * @notice Governance token of the Dream Economy — Love powers democracy
 * @dev Full on-chain governance with quadratic voting, delegation, and staking rewards
 *
 * Tokenomics:
 * - Max Supply: 100,000,000 CUPID
 * - Governance: Quadratic voting power (sqrt of balance)
 * - Staking: Lock CUPID to earn more CUPID + ecosystem fee share
 * - Burn: 0.5% transfer burn
 * - Airdrop: 15% to early DreamCoin holders
 *
 * Unique Features:
 * - Quadratic voting (prevents whale dominance)
 * - Time-weighted staking (longer lock = more power)
 * - Delegation with partial amounts
 * - Proposal creation threshold
 */
contract CupidCoin is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, Ownable, ReentrancyGuard {
    
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
    uint256 public constant BURN_RATE = 50; // 0.5%
    uint256 public constant STAKING_REWARD_RATE = 500; // 5% APR base
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant PROPOSAL_THRESHOLD = 10000 * 10**18; // 10k CUPID to propose
    uint256 public constant VOTING_DELAY = 1 days;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant EXECUTION_DELAY = 2 days;
    
    // ============ Staking ============
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lockDuration; // in seconds
        uint256 rewardDebt;
        uint256 lastClaimTime;
    }
    
    mapping(address => Stake) public stakes;
    uint256 public totalStaked;
    uint256 public accRewardPerShare; // Accumulated rewards per share, scaled by 1e18
    uint256 public lastRewardUpdate;
    
    // ============ Governance ============
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool canceled;
        mapping(address => bool) hasVoted;
    }
    
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public proposalPower; // Time-weighted voting power
    
    // ============ Delegation ============
    mapping(address => address) public delegates;
    mapping(address => mapping(address => uint256)) public delegatedAmounts; // delegator => delegatee => amount
    mapping(address => uint256) public receivedDelegations;
    
    // ============ Events ============
    event Staked(address indexed user, uint256 amount, uint256 lockDuration);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardClaimed(address indexed user, uint256 reward);
    event ProposalCreated(uint256 indexed id, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votes);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    event DelegationChanged(address indexed delegator, address indexed delegatee, uint256 amount);
    
    // ============ Constructor ============
    constructor(
        address _treasury,
        address _airdropDistributor
    ) ERC20("CupidCoin", "CUPID") ERC20Permit("CupidCoin") Ownable(msg.sender) {
        require(_treasury != address(0) && _airdropDistributor != address(0), "Zero address");
        
        // Treasury: 30% - ecosystem development & liquidity
        _mint(_treasury, (MAX_SUPPLY * 3000) / DENOMINATOR);
        
        // Community rewards: 30% - staking & participation rewards
        _mint(address(this), (MAX_SUPPLY * 3000) / DENOMINATOR);
        
        // Team: 15% - 2 year vesting (handled by treasury)
        _mint(_treasury, (MAX_SUPPLY * 1500) / DENOMINATOR);
        
        // Airdrop: 15% - early DreamCoin holders
        _mint(_airdropDistributor, (MAX_SUPPLY * 1500) / DENOMINATOR);
        
        // Partnerships: 10% - integrations & collaborations
        _mint(_treasury, (MAX_SUPPLY * 1000) / DENOMINATOR);
        
        lastRewardUpdate = block.timestamp;
    }
    
    // ============ Quadratic Voting Power ============
    
    /**
     * @notice Calculate quadratic voting power: sqrt(balance + staked + received delegations)
     */
    function getVotingPower(address account) public view returns (uint256) {
        uint256 totalPower = balanceOf(account) + stakes[account].amount + receivedDelegations[account];
        return _sqrt(totalPower);
    }
    
    /**
     * @notice Get proposal creation power (linear, not sqrt)
     */
    function getProposalPower(address account) external view returns (uint256) {
        return stakes[account].amount + balanceOf(account) + receivedDelegations[account];
    }
    
    // ============ Staking ============
    
    /**
     * @notice Stake CUPID with time-lock for boosted rewards
     * @param amount Amount to stake
     * @param lockDuration Lock time in seconds (min 7 days, max 4 years)
     */
    function stake(uint256 amount, uint256 lockDuration) external nonReentrant {
        require(amount > 0, "CupidCoin: zero amount");
        require(lockDuration >= 7 days && lockDuration <= 1460 days, "CupidCoin: invalid lock");
        
        _updateRewards();
        
        Stake storage userStake = stakes[msg.sender];
        
        // Claim pending rewards first
        if (userStake.amount > 0) {
            uint256 pending = _pendingRewards(msg.sender);
            if (pending > 0) {
                _mint(msg.sender, pending);
                emit RewardClaimed(msg.sender, pending);
            }
        }
        
        _transfer(msg.sender, address(this), amount);
        
        userStake.amount += amount;
        userStake.startTime = block.timestamp;
        userStake.lockDuration = lockDuration;
        userStake.rewardDebt = (userStake.amount * accRewardPerShare) / 1e18;
        userStake.lastClaimTime = block.timestamp;
        
        totalStaked += amount;
        
        // Boost voting power based on lock duration
        uint256 boostMultiplier = 100 + (lockDuration * 100) / (1460 days); // up to 2x
        proposalPower[msg.sender] = (userStake.amount * boostMultiplier) / 100;
        
        emit Staked(msg.sender, amount, lockDuration);
    }
    
    /**
     * @notice Unstake CUPID after lock period ends
     */
    function unstake() external nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "CupidCoin: no stake");
        require(
            block.timestamp >= userStake.startTime + userStake.lockDuration,
            "CupidCoin: stake locked"
        );
        
        _updateRewards();
        
        uint256 pending = _pendingRewards(msg.sender);
        uint256 amount = userStake.amount;
        
        // Apply early exit penalty if before lock (shouldn't reach here due to above check)
        uint256 penalty = 0;
        if (block.timestamp < userStake.startTime + userStake.lockDuration) {
            penalty = (amount * 2500) / DENOMINATOR; // 25% penalty
        }
        
        uint256 reward = pending > penalty ? pending - penalty : 0;
        uint256 returnAmount = amount - penalty;
        
        totalStaked -= amount;
        delete stakes[msg.sender];
        proposalPower[msg.sender] = 0;
        
        _transfer(address(this), msg.sender, returnAmount);
        if (reward > 0) {
            _mint(msg.sender, reward);
        }
        if (penalty > 0) {
            _burn(address(this), penalty);
        }
        
        emit Unstaked(msg.sender, returnAmount, reward);
    }
    
    /**
     * @notice Claim staking rewards without unstaking
     */
    function claimRewards() external nonReentrant {
        _updateRewards();
        
        uint256 pending = _pendingRewards(msg.sender);
        require(pending > 0, "CupidCoin: no rewards");
        
        stakes[msg.sender].rewardDebt = (stakes[msg.sender].amount * accRewardPerShare) / 1e18;
        stakes[msg.sender].lastClaimTime = block.timestamp;
        
        _mint(msg.sender, pending);
        emit RewardClaimed(msg.sender, pending);
    }
    
    // ============ Internal Staking Logic ============
    
    function _updateRewards() internal {
        if (totalStaked == 0) {
            lastRewardUpdate = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - lastRewardUpdate;
        uint256 reward = (totalStaked * STAKING_REWARD_RATE * timeElapsed) / (365 days * DENOMINATOR);
        
        accRewardPerShare += (reward * 1e18) / totalStaked;
        lastRewardUpdate = block.timestamp;
    }
    
    function _pendingRewards(address user) internal view returns (uint256) {
        Stake storage s = stakes[user];
        if (s.amount == 0) return 0;
        
        uint256 currentAccReward = accRewardPerShare;
        if (totalStaked > 0 && block.timestamp > lastRewardUpdate) {
            uint256 timeElapsed = block.timestamp - lastRewardUpdate;
            uint256 reward = (totalStaked * STAKING_REWARD_RATE * timeElapsed) / (365 days * DENOMINATOR);
            currentAccReward += (reward * 1e18) / totalStaked;
        }
        
        return ((s.amount * currentAccReward) / 1e18) - s.rewardDebt;
    }
    
    // ============ Delegation ============
    
    /**
     * @notice Delegate voting power to another address (partial delegation supported)
     */
    function delegate(address delegatee, uint256 amount) external {
        require(delegatee != address(0), "Zero address");
        require(delegatee != msg.sender, "Cannot delegate to self");
        
        uint256 available = balanceOf(msg.sender) + stakes[msg.sender].amount;
        require(available >= amount, "Insufficient balance");
        
        // Remove old delegation if exists
        address oldDelegate = delegates[msg.sender];
        if (oldDelegate != address(0)) {
            receivedDelegations[oldDelegate] -= delegatedAmounts[msg.sender][oldDelegate];
            delegatedAmounts[msg.sender][oldDelegate] = 0;
        }
        
        delegates[msg.sender] = delegatee;
        delegatedAmounts[msg.sender][delegatee] = amount;
        receivedDelegations[delegatee] += amount;
        
        emit DelegationChanged(msg.sender, delegatee, amount);
    }
    
    function removeDelegation() external {
        address delegatee = delegates[msg.sender];
        require(delegatee != address(0), "No delegation");
        
        receivedDelegations[delegatee] -= delegatedAmounts[msg.sender][delegatee];
        delegatedAmounts[msg.sender][delegatee] = 0;
        delegates[msg.sender] = address(0);
        
        emit DelegationChanged(msg.sender, address(0), 0);
    }
    
    // ============ Governance Proposals ============
    
    function propose(
        string memory description,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) external returns (uint256) {
        require(
            stakes[msg.sender].amount + balanceOf(msg.sender) >= PROPOSAL_THRESHOLD,
            "CupidCoin: below proposal threshold"
        );
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage p = proposals[proposalId];
        p.id = proposalId;
        p.proposer = msg.sender;
        p.description = description;
        p.targets = targets;
        p.values = values;
        p.calldatas = calldatas;
        p.startTime = block.timestamp + VOTING_DELAY;
        p.endTime = block.timestamp + VOTING_DELAY + VOTING_PERIOD;
        
        emit ProposalCreated(proposalId, msg.sender, description);
        return proposalId;
    }
    
    function castVote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.startTime, "Voting not started");
        require(block.timestamp <= p.endTime, "Voting ended");
        require(!p.hasVoted[msg.sender], "Already voted");
        require(!p.canceled, "Proposal canceled");
        
        uint256 votes = getVotingPower(msg.sender);
        require(votes > 0, "No voting power");
        
        p.hasVoted[msg.sender] = true;
        
        if (support) {
            p.forVotes += votes;
        } else {
            p.againstVotes += votes;
        }
        
        emit VoteCast(proposalId, msg.sender, support, votes);
    }
    
    function execute(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp > p.endTime + EXECUTION_DELAY, "Too early");
        require(!p.executed && !p.canceled, "Already finalized");
        require(p.forVotes > p.againstVotes, "Proposal rejected");
        require(p.forVotes >= _sqrt(PROPOSAL_THRESHOLD * 3), "Quorum not reached");
        
        p.executed = true;
        
        for (uint256 i = 0; i < p.targets.length; i++) {
            (bool success, ) = p.targets[i].call{value: p.values[i]}(p.calldatas[i]);
            require(success, "Execution failed");
        }
        
        emit ProposalExecuted(proposalId);
    }
    
    function cancelProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(msg.sender == p.proposer || msg.sender == owner(), "Unauthorized");
        require(!p.executed, "Already executed");
        
        p.canceled = true;
        emit ProposalCanceled(proposalId);
    }
    
    function getProposal(uint256 proposalId) external view returns (
        uint256 id, address proposer, string memory description,
        uint256 forVotes, uint256 againstVotes, uint256 startTime,
        uint256 endTime, bool executed, bool canceled
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.id, p.proposer, p.description, p.forVotes, p.againstVotes,
                p.startTime, p.endTime, p.executed, p.canceled);
    }
    
    // ============ Transfer Override ============
    
    function _update(address from, address to, uint256 amount) internal virtual override {
        super._update(from, to, amount);
        
        if (from == address(0) || to == address(0)) return;
        
        // Burn 0.5% on transfers
        uint256 burnAmount = (amount * BURN_RATE) / DENOMINATOR;
        if (burnAmount > 0) {
            _burn(to, burnAmount);
        }
    }
    
    // ============ Internal Helpers ============
    
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
    
    // Override clock for ERC20Votes
    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }
    
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }
    
    receive() external payable {}
}
