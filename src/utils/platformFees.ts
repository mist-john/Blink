import { FEE_RECIPIENT } from '@/constants/fees';
import { PLATFORM_FEES } from '@/constants/fees';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction, TransactionInstruction } from '@solana/web3.js';

/**
 * Creates a transaction instruction for a platform fee payment
 * @param feeAmount Fee amount in SOL
 * @param payer Public key of the fee payer
 * @param recipient Public key of the fee recipient (defaults to platform fee recipient)
 * @param referralWallet Optional referral wallet to receive a commission
 * @param referralPercentage Optional percentage of the fee to send to the referral
 * @returns Transaction instruction that can be added to an existing transaction
 */
export const createPlatformFeeInstruction = (
  feeAmount: number = PLATFORM_FEES.BASE_FEE,
  payer: PublicKey,
  recipient: PublicKey = new PublicKey(FEE_RECIPIENT),
  referralWallet?: string,
  referralPercentage?: number
): TransactionInstruction | TransactionInstruction[] => {
  // Convert SOL to lamports
  const lamports = feeAmount * LAMPORTS_PER_SOL;

  // If there's a valid referral, create instructions to split the fee
  if (referralWallet && referralPercentage && referralPercentage > 0) {
    // Calculate referral amount (capped at 50% max)
    const cappedPercentage = Math.min(referralPercentage, 50);
    const referralAmount = Math.floor((lamports * cappedPercentage) / 100);
    const platformAmount = lamports - referralAmount;
    
    // Create instructions for both transfers
    const platformInstruction = SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: recipient,
      lamports: platformAmount,
    });
    
    const referralInstruction = SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: new PublicKey(referralWallet),
      lamports: referralAmount,
    });
    
    return [platformInstruction, referralInstruction];
  }

  // Create a standard transfer instruction for the fee
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: recipient,
    lamports,
  });
};

/**
 * Adds a platform fee to an existing transaction
 * @param transaction Transaction to add the fee to
 * @param feeAmount Fee amount in SOL
 * @param payer Public key of the fee payer
 * @param recipient Public key of the fee recipient (defaults to platform fee recipient)
 * @param referralWallet Optional referral wallet to receive a commission
 * @param referralPercentage Optional percentage of the fee to send to the referral
 * @returns The transaction with fee instruction added or the fee instruction if input is a VersionedTransaction
 */
export const addPlatformFeeToTransaction = (
  transaction: Transaction | VersionedTransaction,
  feeAmount: number = PLATFORM_FEES.BASE_FEE,
  payer: PublicKey,
  recipient: PublicKey = new PublicKey(FEE_RECIPIENT),
  referralWallet?: string,
  referralPercentage?: number
): Transaction | TransactionInstruction | TransactionInstruction[] | undefined => {
  // if (process.env.NODE_ENV === 'development') {
  //   return;
  // }
  
  const feeInstructions = createPlatformFeeInstruction(
    feeAmount, 
    payer, 
    recipient, 
    referralWallet, 
    referralPercentage
  );
  
  // Handle different transaction types
  if (transaction instanceof Transaction) {
    if (Array.isArray(feeInstructions)) {
      feeInstructions.forEach(instruction => transaction.add(instruction));
    } else {
      transaction.add(feeInstructions);
    }
    return transaction;
  } else {
    // For VersionedTransaction, just return the instruction(s) to be added manually
    return feeInstructions;
  }
};