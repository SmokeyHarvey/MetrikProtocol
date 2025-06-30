// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract Faucet {
    address public owner;
    IERC20 public metrik;
    IERC20 public usdc;

    event Claimed(address indexed user, address indexed token, uint256 amount);
    event Deposited(address indexed from, address indexed token, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _metrik, address _usdc) {
        owner = msg.sender;
        metrik = IERC20(_metrik);
        usdc = IERC20(_usdc);
    }

    // Anyone can claim any amount of Metrik or USDC
    function claim(address token, uint256 amount) external {
        require(token == address(metrik) || token == address(usdc), "Invalid token");
        require(amount > 0, "Amount must be > 0");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Faucet empty");
        IERC20(token).transfer(msg.sender, amount);
        emit Claimed(msg.sender, token, amount);
    }

    // Owner can withdraw tokens (in case you want to recover them)
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }

    // Deposit tokens to the faucet (just send tokens to this contract address)
    // Optionally, you can call this to emit an event
    function deposit(address token, uint256 amount) external {
        require(token == address(metrik) || token == address(usdc), "Invalid token");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Deposited(msg.sender, token, amount);
    }
} 