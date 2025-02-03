const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Token = require("./models/Token");
const { ethers } = require("ethers");
const cors = require("cors");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected");
    // fetch_tokens();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Set up Shibarium provider and contract
const provider = new ethers.providers.JsonRpcProvider(
  process.env.SHIBARIUM_INFURA_URL
);
const pairFactoryABI = require("./abis/PairFactory.json");
const pairFactoryAddress = process.env.PAIR_FACTORY_ADDRESS;
const pairFactoryContract = new ethers.Contract(
  pairFactoryAddress,
  pairFactoryABI,
  provider
);
const pairABI = require("./abis/Pair.json");
const erc20ABI = require("./abis/ERC20.json");

// Fetch tokens function
const fetch_tokens = async () => {
  try {
    const pairLength = await pairFactoryContract.allPairsLength();
    console.log("Number of pairs: ", pairLength.toString());

    for (let i = 232; i < pairLength; i++) {
      const pairAddress = await pairFactoryContract.allPairs(i);
      console.log(`Pair ${i}: `, pairAddress);
      const pairContract = new ethers.Contract(pairAddress, pairABI, provider);
      const token1Address = await pairContract.token0();
      const token2Address = await pairContract.token1();

      // Fetch token symbols
      const token1Contract = new ethers.Contract(
        token1Address,
        erc20ABI,
        provider
      );
      const token2Contract = new ethers.Contract(
        token2Address,
        erc20ABI,
        provider
      );

      const token1Symbol = await token1Contract.symbol();
      const token2Symbol = await token2Contract.symbol();
      const token1Name = await token1Contract.name();
      const token2Name = await token2Contract.name();
      const token1Decimals = await token1Contract.decimals();
      const token2Decimals = await token2Contract.decimals();

      await saveTokenIfNotExists(
        token1Address,
        token1Symbol,
        token1Name,
        token1Decimals
      );
      await saveTokenIfNotExists(
        token2Address,
        token2Symbol,
        token2Name,
        token2Decimals
      );
    }
  } catch (error) {
    console.error("Error fetching pairs: ", error);
  }
};

// Function to save token if it doesn't already exist
const saveTokenIfNotExists = async (address, symbol, name, decimals) => {
  try {
    const existingToken = await Token.findOne({ address });
    if (!existingToken) {
      const newToken = new Token({
        address,
        name,
        symbol,
        decimals,
      });
      await newToken.save();
      console.log(`Saved new token: ${symbol} at address: ${address}`);
    } else {
      console.log(`Token already exists: ${symbol} at address: ${address}`);
    }
  } catch (error) {
    console.error("Error saving token: ", error);
  }
};

// Routes
app.post("/tokens", async (req, res) => {
  const { name, address, logo } = req.body;
  const token = new Token({ name, address, logo });
  try {
    await token.save();
    res.status(201).json(token);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/tokens", async (req, res) => {
  try {
    // Fetch tokens excluding those with flag set to false
    const tokens = await Token.find({ flag: { $ne: false } });
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
