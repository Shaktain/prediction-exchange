// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title PredictExExchange
 * @notice Prediction market exchange with off-chain order matching and on-chain settlement
 * @dev Supports EIP-712 signed orders, batch settlement, and outcome token redemption
 */
contract PredictExExchange is Ownable, EIP712 {
    using ECDSA for bytes32;

    IERC20 public immutable usdc;
    IERC1155 public immutable outcomeTokens;

    // User balances (USDC held in exchange)
    mapping(address => uint256) public balances;

    // Nonce tracking for replay protection
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    // Market resolution tracking
    mapping(uint256 => bool) public marketResolved;
    mapping(uint256 => bool) public marketOutcome; // true = YES, false = NO

    // Order structure for EIP-712
    struct Order {
        uint256 marketId;
        uint8 side;        // 0 = YES, 1 = NO
        uint8 direction;   // 0 = BUY, 1 = SELL
        uint256 price;
        uint256 quantity;
        uint256 expiration;
        uint256 nonce;
    }

    // EIP-712 type hash
    bytes32 private constant ORDER_TYPEHASH = keccak256(
        "Order(uint256 marketId,uint8 side,uint8 direction,uint256 price,uint256 quantity,uint256 expiration,uint256 nonce)"
    );

    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event TradeSettled(
        uint256 indexed marketId,
        address indexed buyer,
        address indexed seller,
        uint8 side,
        uint256 price,
        uint256 quantity
    );
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event TokensRedeemed(address indexed user, uint256 indexed marketId, uint256 amount);

    constructor(
        address _usdc,
        address _outcomeTokens
    ) Ownable(msg.sender) EIP712("PredictEx", "1") {
        usdc = IERC20(_usdc);
        outcomeTokens = IERC1155(_outcomeTokens);
    }

    /**
     * @notice Deposit USDC into the exchange
     * @param amount Amount of USDC to deposit (in 6 decimals)
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        balances[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice Withdraw USDC from the exchange
     * @param amount Amount of USDC to withdraw (in 6 decimals)
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        require(usdc.transfer(msg.sender, amount), "Transfer failed");

        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @notice Emergency withdraw function for owner (in case of issues)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }

    /**
     * @notice Get user's USDC balance in the exchange
     * @param user User address
     * @return User's balance
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    /**
     * @notice Settle a batch of matched trades
     * @param buyOrders Array of buy orders
     * @param sellOrders Array of sell orders
     * @param buySignatures Array of buy order signatures
     * @param sellSignatures Array of sell order signatures
     * @param quantities Array of quantities to settle
     */
    function settleBatch(
        Order[] calldata buyOrders,
        Order[] calldata sellOrders,
        bytes[] calldata buySignatures,
        bytes[] calldata sellSignatures,
        uint256[] calldata quantities
    ) external onlyOwner {
        require(buyOrders.length == sellOrders.length, "Array length mismatch");
        require(buyOrders.length == quantities.length, "Array length mismatch");

        for (uint256 i = 0; i < buyOrders.length; i++) {
            _settleTrade(
                buyOrders[i],
                sellOrders[i],
                buySignatures[i],
                sellSignatures[i],
                quantities[i]
            );
        }
    }

    /**
     * @notice Settle a single trade
     */
    function _settleTrade(
        Order calldata buyOrder,
        Order calldata sellOrder,
        bytes calldata buySignature,
        bytes calldata sellSignature,
        uint256 quantity
    ) private {
        // Verify orders match
        require(buyOrder.marketId == sellOrder.marketId, "Market mismatch");
        require(buyOrder.side == sellOrder.side, "Side mismatch");
        require(buyOrder.direction == 0, "Buy order wrong direction");
        require(sellOrder.direction == 1, "Sell order wrong direction");
        require(buyOrder.price == sellOrder.price, "Price mismatch");

        // Verify signatures and nonces
        address buyer = _verifyOrderSignature(buyOrder, buySignature);
        address seller = _verifyOrderSignature(sellOrder, sellSignature);

        require(!usedNonces[buyer][buyOrder.nonce], "Buy nonce already used");
        require(!usedNonces[seller][sellOrder.nonce], "Sell nonce already used");

        // Check expirations
        require(block.timestamp <= buyOrder.expiration, "Buy order expired");
        require(block.timestamp <= sellOrder.expiration, "Sell order expired");

        // Mark nonces as used
        usedNonces[buyer][buyOrder.nonce] = true;
        usedNonces[seller][sellOrder.nonce] = true;

        // Calculate amounts
        uint256 cost = (quantity * buyOrder.price) / 1e6; // Price is in 6 decimals

        // Check balances
        require(balances[buyer] >= cost, "Buyer insufficient balance");

        // Transfer USDC: buyer -> seller
        balances[buyer] -= cost;
        balances[seller] += cost;

        // Mint outcome tokens
        uint256 tokenId = _getTokenId(buyOrder.marketId, buyOrder.side);
        outcomeTokens.safeTransferFrom(
            address(0), // Mint from zero address
            buyer,
            tokenId,
            quantity,
            ""
        );

        emit TradeSettled(
            buyOrder.marketId,
            buyer,
            seller,
            buyOrder.side,
            buyOrder.price,
            quantity
        );
    }

    /**
     * @notice Verify order signature using EIP-712
     */
    function _verifyOrderSignature(
        Order calldata order,
        bytes calldata signature
    ) private view returns (address) {
        bytes32 structHash = keccak256(
            abi.encode(
                ORDER_TYPEHASH,
                order.marketId,
                order.side,
                order.direction,
                order.price,
                order.quantity,
                order.expiration,
                order.nonce
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        
        require(signer != address(0), "Invalid signature");
        return signer;
    }

    /**
     * @notice Resolve a market (owner only)
     * @param marketId Market ID to resolve
     * @param outcome true = YES wins, false = NO wins
     */
    function resolveMarket(uint256 marketId, bool outcome) external onlyOwner {
        require(!marketResolved[marketId], "Market already resolved");

        marketResolved[marketId] = true;
        marketOutcome[marketId] = outcome;

        emit MarketResolved(marketId, outcome);
    }

    /**
     * @notice Redeem winning outcome tokens for USDC
     * @param marketId Market ID to redeem from
     */
    function redeemWinnings(uint256 marketId) external {
        require(marketResolved[marketId], "Market not resolved");

        bool outcome = marketOutcome[marketId];
        uint256 winningTokenId = _getTokenId(marketId, outcome ? 0 : 1); // 0 = YES, 1 = NO

        // Check user's token balance
        uint256 tokenBalance = outcomeTokens.balanceOf(msg.sender, winningTokenId);
        require(tokenBalance > 0, "No winning tokens");

        // Burn tokens
        outcomeTokens.safeTransferFrom(
            msg.sender,
            address(0), // Burn to zero address
            winningTokenId,
            tokenBalance,
            ""
        );

        // Each winning token is worth 1 USDC (1e6)
        uint256 payout = tokenBalance; // Token quantity is already in 6 decimals

        // Transfer USDC to winner
        balances[msg.sender] += payout;

        emit TokensRedeemed(msg.sender, marketId, payout);
    }

    /**
     * @notice Calculate token ID from market ID and side
     * @dev Token ID format: marketId * 2 + side (YES=0, NO=1)
     */
    function _getTokenId(uint256 marketId, uint8 side) private pure returns (uint256) {
        return marketId * 2 + side;
    }

    /**
     * @notice Required for receiving ERC1155 tokens
     */
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    /**
     * @notice Required for batch ERC1155 tokens
     */
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
