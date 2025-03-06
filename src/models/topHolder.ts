import mongoose from 'mongoose';

const TopHolderSchema = new mongoose.Schema({
  mintAddress: { type: String, required: true, index: true }, // Token Address
  owner: { type: String, required: true }, // Wallet Address
  balance: { type: Number, required: true }, // Token Balance
  indexName: {type: String, required: true},
  updatedAt: { type: Date, default: Date.now }, // Last Updated Timestamp
});

// Index to quickly find holders by mintAddress
TopHolderSchema.index({ mintAddress: 1 });

export const TopHolder = mongoose.model('TopHolder', TopHolderSchema);
