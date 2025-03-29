"use client";

import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  getMinimumBalanceForRentExemptMint,
  createSetAuthorityInstruction,
  AuthorityType,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import {
  PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { idl } from "../../idl/idl";
import UploadFileToBlockChain from "@/utils/uploadToArweave";

const PUMPFUN_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
);
const feeRecipient = new PublicKey(
  "62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV"
); //pump fun fee address
const EVENT_AUTH = new PublicKey(
  "Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"
); // pump fun event authority address

export interface CreateTokenParams {
  connection: Connection;
  payer: PublicKey;
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  totalSupply: number;
  imageUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  anchorWallet?: any;
  devWalletAmount?: number;
}

export interface MetadataJson {
  name: string;
  symbol: string;
  description: string;
  image?: string;
  showName: boolean;
  twitter?: string;
  telegram?: string;
  website?: string;
  tags: string[];
}

export async function createToken({
  connection,
  payer,
  name,
  symbol,
  description,
  decimals,
  totalSupply,
  imageUrl,
  websiteUrl,
  twitterUrl,
  telegramUrl,
}: CreateTokenParams): Promise<{
  transaction: Transaction;
  mintKeypair: Keypair;
  tokenATA: PublicKey;
}> {
  // Generate a new keypair for the mint account
  const mintKeypair = Keypair.generate();

  // Prepare metadata JSON for Arweave
  const metadataJson: MetadataJson = {
    name,
    symbol,
    description,
    image: imageUrl,
    showName: true,
    twitter: twitterUrl,
    telegram: telegramUrl,
    website: websiteUrl,
    tags: ["meme"],
  };

  // Upload metadata to Arweave
  const metadataBlob = new Blob([JSON.stringify(metadataJson)], {
    type: "application/json",
  });
  const arweaveUrl = await UploadFileToBlockChain(metadataBlob);

  if (!arweaveUrl) {
    throw new Error("Failed to upload metadata to Arweave");
  }

  // Calculate minimum lamports needed for the mint
  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  // Get the associated token account address
  const tokenATA = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    payer
  );

  // Add priority fee instruction (150,000 microlamports = 0.00015 SOL)
  const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1_000_000,
  });

  // Add compute units instruction (maximum allowed)
  const addComputeUnitsInstruction = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_400_000,
  });

  // Create metadata instruction with Arweave URL
  const metadataInstruction = createCreateMetadataAccountV3Instruction(
    {
      metadata: PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        PROGRAM_ID
      )[0],
      mint: mintKeypair.publicKey,
      mintAuthority: payer,
      payer,
      updateAuthority: payer,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          name,
          symbol,
          uri: arweaveUrl,
          creators: [
            {
              address: new PublicKey(payer.toBase58()),
              verified: true,
              share: 100,
            },
          ],
          sellerFeeBasisPoints: 0,
          collection: null,
          uses: null,
        },
        isMutable: false,
        collectionDetails: null,
      },
    }
  );

  // Create transaction
  const transaction = new Transaction().add(
    // Add priority fee and compute units instructions first
    priorityFeeInstruction,
    addComputeUnitsInstruction,
    // Create mint account
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    // Initialize mint
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      payer,
      payer,
      TOKEN_PROGRAM_ID
    ),
    // Create associated token account
    createAssociatedTokenAccountInstruction(
      payer,
      tokenATA,
      payer,
      mintKeypair.publicKey
    ),
    // Mint tokens
    createMintToInstruction(
      mintKeypair.publicKey,
      tokenATA,
      payer,
      totalSupply * 10 ** decimals
    ),
    // Create metadata
    metadataInstruction,
    // Disable mint authority
    createSetAuthorityInstruction(
      mintKeypair.publicKey,
      payer,
      AuthorityType.MintTokens,
      null,
      [],
      TOKEN_PROGRAM_ID
    ),
    // Disable freeze authority
    createSetAuthorityInstruction(
      mintKeypair.publicKey,
      payer,
      AuthorityType.FreezeAccount,
      null,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  return { transaction, mintKeypair, tokenATA };
}
//const CONNECTION = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,"confirmed");
//const anchorWallet = useAnchorWallet();
//const program = useMemo(() => {
//  if (anchorWallet) {
//    const provider = new anchor.AnchorProvider(CONNECTION, anchorWallet, anchor.AnchorProvider.defaultOptions())
//    return new anchor.Program(idl, PUMPFUN_PROGRAM_ID, provider)
//  }
//}, [CONNECTION,anchorWallet])

export async function createPumpFunToken({
  connection,
  payer,
  name,
  symbol,
  description,
  decimals,
  totalSupply,
  imageUrl,
  websiteUrl,
  twitterUrl,
  telegramUrl,
  anchorWallet,
  devWalletAmount,
}: CreateTokenParams): Promise<{
  transaction: Transaction;
  mintKeypair: Keypair;
  tokenATA: PublicKey;
}> {
  try {
    const mintKeypair = Keypair.generate();
    const tokenMint = mintKeypair.publicKey;

    const imgresponse = await fetch(imageUrl || "");
    if (!imgresponse.ok) {
      console.log(`Failed to fetch image: ${imgresponse.statusText}`);
    }

    const blob = await imgresponse.blob();

    const formData = new FormData();
    formData.append("file", blob);
    formData.append("name", name);
    formData.append("symbol", symbol);
    formData.append("description", description);
    formData.append("twitter", twitterUrl || "");
    formData.append("telegram", telegramUrl || "");
    formData.append("website", websiteUrl || "");
    formData.append("showName", "true");

    const metadataResponse = await fetch("/api/pump/ipfs", {
      method: "POST",
      body: formData,
    });

    const metadataResponseJSON = await metadataResponse.json();
    const tokenUri = metadataResponseJSON.metadataUri;

    let program: any;

    if (anchorWallet) {
      const provider = new anchor.AnchorProvider(
        connection,
        anchorWallet,
        anchor.AnchorProvider.defaultOptions()
      );
      program = new anchor.Program(idl, PUMPFUN_PROGRAM_ID, provider);
    }

    // Lookup Table
    const firstAddressLookup = new PublicKey(
      "Ej3wFtgk3WywPnWPD3aychk38MqTdrjtqXkzbK8FpUih"
    ); // lookup table address.
    const lookupTableAccount =
      await connection.getAddressLookupTable(firstAddressLookup);
    const lookupTableAccounts = [lookupTableAccount.value];

    let instructions = [];

    let mintIx: any;

    // Get the create transaction
    const pumpportalResponse = await fetch(
      `https://pumpportal.fun/api/trade-local`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicKey: payer,
          action: "create",
          tokenMetadata: {
            name: name,
            symbol: symbol,
            uri: tokenUri,
          },
          mint: tokenMint.toBase58(),
          denominatedInSol: "false",
          amount: devWalletAmount || 0, // Pass the token amount, not SOL amount
          slippage: 5,
          priorityFee: 0.0005,
          pool: "pump",
        }),
      }
    );

    if (pumpportalResponse.status === 200) {
      const data = await pumpportalResponse.arrayBuffer();
      const tx = VersionedTransaction.deserialize(new Uint8Array(data));
      const transactionMsg = TransactionMessage.decompile(tx.message);

      for (const ins of transactionMsg.instructions) {
        if (
          ins.programId.toBase58() ===
          "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
        ) {
          //pump.fun program address
          mintIx = ins; // meme coin creation instruction. This is for get creation instruction from pumpportal api.
          break;
        }
      }

      // tx.sign([mintKeypair, PAYER]);
    } else {
      console.log("ERROR:::", pumpportalResponse.statusText); // log error
    }

    // Calculate max SOL cost based on token amount
    // 10,000 tokens costs approximately 0.01 SOL
    const tokenBasedMaxSolCost = devWalletAmount
      ? (devWalletAmount / 10000) * 0.01 * 1.05
      : 0;
    // Use a reasonable minimum for small token amounts
    const maxSolCost =
      tokenBasedMaxSolCost < 0.01 ? 0.01 : tokenBasedMaxSolCost;

    const txBuyDev = devWalletAmount
      ? await buildMintBuyTx(
          program,
          payer,
          tokenMint,
          maxSolCost,
          devWalletAmount // Pass token amount directly
        )
      : { instructions: [] };

    instructions = [mintIx, ...(devWalletAmount ? txBuyDev.instructions : [])];

    // Get the associated token account address
    const tokenATA = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      payer
    );

    // Add priority fee instruction (150,000 microlamports = 0.00015 SOL)
    const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1_000_000,
    });

    // Add compute units instruction (maximum allowed)
    const addComputeUnitsInstruction = ComputeBudgetProgram.setComputeUnitLimit(
      {
        units: 1_400_000,
      }
    );

    // Create transaction
    let transaction = new Transaction().add(
      // Add priority fee and compute units instructions first
      priorityFeeInstruction,
      addComputeUnitsInstruction
    );
    for (let i = 0; i < instructions.length; i++) {
      transaction = transaction.add(instructions[i]);
    }

    return { transaction, mintKeypair, tokenATA };
  } catch (e) {
    console.error("Error creating pump fun token:", e);
    throw e;
  }
}

const buildMintBuyTx = async (
  program: any,
  payer: PublicKey,
  tokenMint: PublicKey,
  maxSolCost: any,
  tokenAmount: any
) => {
  const mint = new PublicKey(tokenMint);
  const bondingCurve = await getBondingCurve(mint, program.programId);
  const bondingCurveAta = await getAssociatedTokenAddress(
    mint,
    bondingCurve!,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const globalState = new PublicKey(
    "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf" //pump fun global account address
  );
  const user = payer;
  const userAta = getAssociatedTokenAddressSync(mint, user, true);
  const signerTokenAccount = getAssociatedTokenAddressSync(
    mint,
    user,
    true,
    TOKEN_PROGRAM_ID
  );

  const decimals = 6;
  const finalAmount = tokenAmount;

  //creating tx;
  const tx = new Transaction();

  tx.add(
    createAssociatedTokenAccountInstruction(
      user,
      signerTokenAccount,
      user,
      mint
    )
  );

  const snipeIx = await program.methods
    .buy(
      new anchor.BN(finalAmount * 10 ** decimals),
      new anchor.BN(maxSolCost * LAMPORTS_PER_SOL)
    )
    .accounts({
      global: globalState,
      feeRecipient: feeRecipient,
      mint: mint,
      bondingCurve: bondingCurve,
      associatedBondingCurve: bondingCurveAta,
      associatedUser: userAta,
      user: user,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      eventAuthority: EVENT_AUTH,
      program: program.programId,
    })
    .instruction();
  tx.add(snipeIx);

  return tx;
};

const sleep = (ms: number | undefined) => new Promise((r) => setTimeout(r, ms));
const getBondingCurve = async (tokenMint: any, programId: any) => {
  let count = 0;
  while (count < 20) {
    const seedString = "bonding-curve";

    const [PDA, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from(seedString), tokenMint.toBuffer()],
      programId
    );

    if (PDA) return new PublicKey(PDA);
    else {
      count++;
      await sleep(500);
    }
  }
};

// const generatePumpFunTokenAddress = async () => {
//   while (1) {
//     const keypair = Keypair.generate();
//     if (keypair.publicKey.toBase58().slice(-4) === "pump") {
//       return keypair;
//     }
//   }
// }
