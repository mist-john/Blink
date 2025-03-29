import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { getMint } from "@solana/spl-token";
import toast from "react-hot-toast";
import { createPumpFunToken } from "./createToken";
import { addPlatformFeeToTransaction } from "@/utils/platformFees";

export interface TokenLaunchResult {
  name: string;
  symbol: string;
  contractAddress: string;
  result?: any;
  transactionSignature?: string;
}


export async function handlePumpFunLaunch({
  connection,
  publicKey,
  signTransaction,
  selectedCoin,
  anchorWallet,
  tokenAmount,
}: {
  connection: Connection;
  publicKey: PublicKey;
  signTransaction: (transaction: any) => Promise<any>;
  selectedCoin: {
    id: string;
    title: string;
    ticker: string;
    description?: string;
    imageUrl?: string;
    socials?: {
      website?: string;
      twitter?: string;
      telegram?: string;
    };
  };
  anchorWallet: AnchorWallet;
  tokenAmount?: number;
}): Promise<TokenLaunchResult> {
  // Get base launch fee
  const baseLaunchFee = 0.001;

  

  
  try {
    // Get the original token's decimals with fallback
    let decimals = 9; // Default to 9 decimals if we can't fetch
    try {
      const originalMint = new PublicKey(selectedCoin.id);
      const mintInfo = await getMint(connection, originalMint);
      decimals = mintInfo.decimals;
    } catch (error) {
      console.error("Error fetching token decimals:", error);
      toast.error("Could not fetch token decimals, using default value of 9");
    }

    // Create token with Pump.fun
    const { transaction, mintKeypair, tokenATA } = await createPumpFunToken({
      connection,
      payer: publicKey,
      name: selectedCoin.title,
      symbol: selectedCoin.ticker,
      description: selectedCoin.description || "",
      decimals,
      totalSupply: 1_000_000_000,
      imageUrl: selectedCoin.imageUrl,
      websiteUrl: selectedCoin.socials?.website,
      twitterUrl: selectedCoin.socials?.twitter,
      telegramUrl: selectedCoin.socials?.telegram,
      anchorWallet,
      devWalletAmount: tokenAmount,
    });

    // Check for referral code in localStorage
    // This was already done above, so we don't need to do it again
    

      addPlatformFeeToTransaction(
        transaction,
        baseLaunchFee,
        publicKey
      );


    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    // Partial sign with mint keypair
    transaction.partialSign(mintKeypair);

    // Sign transaction with user's wallet
    const signedTransaction = await signTransaction(transaction);

    // Send transaction
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize()
    );

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: blockhash,
      lastValidBlockHeight: (await connection.getLatestBlockhash())
        .lastValidBlockHeight,
    });

    if (confirmation.value.err) {

      
      throw new Error("Transaction failed");
    }



    return {
      name: selectedCoin.title,
      symbol: selectedCoin.ticker,
      contractAddress: mintKeypair.publicKey.toBase58(),
      result: confirmation,
      transactionSignature: signature,
    };
  } catch (error) {
    throw error;
  }
}

