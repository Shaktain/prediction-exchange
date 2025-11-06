// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PredictionVault is ReentrancyGuard, Ownable {
    IERC20 public immutable usdc;
    
    // User balances
    mapping(address => uint256) public balances;
    
    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event MarketSettlement(uint256 indexed marketId, address indexed winner, uint256 amount);
    
    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }
    
    // Deposit USDC
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        balances[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }
    
    // Withdraw USDC
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        require(usdc.transfer(msg.sender, amount), "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    // Settle market (called by backend after resolution)
    function settleMarket(
        uint256 marketId,
        address[] calldata winners,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        require(winners.length == amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < winners.length; i++) {
            balances[winners[i]] += amounts[i];
            emit MarketSettlement(marketId, winners[i], amounts[i]);
        }
    }
    
    // Get user balance
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
}