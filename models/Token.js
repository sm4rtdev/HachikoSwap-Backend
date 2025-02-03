const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  decimals: { type: Number, required: true },
  flag: { type: Boolean },
  logo: { type: String },
});

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;
