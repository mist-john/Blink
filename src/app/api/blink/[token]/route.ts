import {
  ActionGetResponse,
  ActionPostRequest,
  ACTIONS_CORS_HEADERS,
  LinkedAction,
} from "@solana/actions";
import {
  Connection,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import { PumpFunSDK } from "pumpdotfun-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Metaplex } from "@metaplex-foundation/js";

// Constants
const WSOL_ADDRESS = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6/quote";
const JUPITER_SWAP_API = "https://quote-api.jup.ag/v6/swap";
const RPC_URL =
  "https://mainnet.helius-rpc.com/?api-key=58786268-db13-43ef-8a98-b17fac51100f";

// Connection settings
const connection = new Connection(RPC_URL, {
  commitment: "processed",
  confirmTransactionInitialTimeout: 60000,
});

// Metaplex instance
const metaplex = new Metaplex(connection);

// Create SDK provider
const getProvider = (userPubKey: PublicKey) => {
  const wallet = new NodeWallet(Keypair.generate());
  return new AnchorProvider(connection, wallet, { commitment: "processed" });
};

// Get Jupiter quote
async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number
) {
  const response = await fetch(
    `${JUPITER_QUOTE_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`
  );
  return await response.json();
}

// Get Jupiter swap transaction
async function getJupiterSwap(quoteResponse: any) {
  const response = await fetch(JUPITER_SWAP_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: quoteResponse.userPublicKey,
      wrapUnwrapSOL: true,
    }),
  });
  return await response.json();
}

// Get token metadata
async function getTokenMetadata(mint: PublicKey) {
  try {
    const metadata = await metaplex.nfts().findByMint({ mintAddress: mint });
    return {
      name: metadata.name,
      symbol: metadata.symbol,
      image: metadata.json?.image || "",
      description: metadata.json?.description || "",
      attributes: metadata.json?.attributes || [],
    };
  } catch (error) {
    console.error("Token metadata fetch error:", error);
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const tokenAddress = new PublicKey(params.token);
    const provider = getProvider(
      new PublicKey("11111111111111111111111111111111")
    );
    const sdk = new PumpFunSDK(provider);

    try {
      const [bondingCurveAccount, metadata] = await Promise.all([
        sdk.getBondingCurveAccount(tokenAddress),
        getTokenMetadata(tokenAddress),
      ]);

      const url = new URL(request.url);
      const responseBody: ActionGetResponse = {
        icon: metadata?.image || "",
        title: `${metadata?.name || "Unknown"} (${
          metadata?.symbol || "Unknown"
        })`,
        label: `Buy ${metadata?.symbol || "Unknown"}`,
        description: metadata?.description || "Unknown",
        links: {
          actions: [
            {
              href: `${url.origin}/api/blink/${params.token}?action=buy&amount=0.1`,
              label: `Buy ${metadata?.symbol || "token"} for 0.1 SOL`,
              type: "transaction",
            },
            {
              href: `${url.origin}/api/blink/${params.token}?action=buy&amount=0.5`,
              label: `Buy ${metadata?.symbol || "token"} for 0.5 SOL`,
              type: "transaction",
            },
            {
              href: `${url.origin}/api/blink/${params.token}?action=buy&amount=1`,
              label: `Buy ${metadata?.symbol || "token"} for 1 SOL`,
              type: "transaction",
            },
            {
              label: "Buy Custom Amount",
              href: `${url.origin}/api/blink/${params.token}?action=buy&amount={amount}`,
              parameters: [
                {
                  name: "amount",
                  label: "Enter the amount of SOL to buy",
                  required: true,
                },
              ],
              type: "transaction",
            } as LinkedAction,
          ],
        },
      };

      return Response.json(responseBody, { headers: ACTIONS_CORS_HEADERS });
    } catch (err) {
      return Response.json(
        { error: "Token not found or bonding curve is complete" },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }
  } catch (err) {
    return Response.json(
      { error: "Invalid token address" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const tokenAddress = new PublicKey(params.token);
    const requestBody: ActionPostRequest = await request.json();
    const userPubKey = new PublicKey(requestBody.account);

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const amountParam = url.searchParams.get("amount");

    if (action === "buy") {
      const amount = parseFloat(amountParam ?? "0.01");
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      const commissionPercentage = 0.01; // %1
      const commissionLamports = Math.floor(lamports * commissionPercentage);
      const netLamports = lamports - commissionLamports;
      const commissionWallet = new PublicKey(
        "8TNkbQ1ukAivBwZVSisbFmWTEMXVgy5cPZs3sZDhbged"
      );

      try {
        const provider = getProvider(userPubKey);
        const sdk = new PumpFunSDK(provider);

        try {
          const bondingCurveAccount = await sdk.getBondingCurveAccount(
            tokenAddress
          );
          if (bondingCurveAccount) {
            const buyResult = await sdk.getBuyInstructionsBySolAmount(
              userPubKey,
              tokenAddress,
              BigInt(lamports),
              BigInt(500)
            );

            if (buyResult) {
              const tx = new Transaction();
              tx.add(...buyResult.instructions);
              tx.add(
                SystemProgram.transfer({
                  fromPubkey: userPubKey,
                  toPubkey: commissionWallet,
                  lamports: commissionLamports,
                })
              );
              tx.feePayer = userPubKey;

              const { blockhash } = await connection.getLatestBlockhash(
                "confirmed"
              );
              tx.recentBlockhash = blockhash;

              const serialized = tx.serialize({
                requireAllSignatures: false,
                verifySignatures: false,
              });

              return Response.json(
                {
                  transaction: serialized.toString("base64"),
                  message: `Transaction prepared: Buy token with ${amountParam} SOL (via Pump.fun)`,
                  type: "transaction",
                },
                { headers: ACTIONS_CORS_HEADERS }
              );
            }
          }
        } catch (err: any) {
          if (
            err.message.includes("Curve is complete") ||
            err.message.includes("complete")
          ) {
            // Proceed to Jupiter swap
          }
        }

        const quoteResponse = await getJupiterQuote(
          WSOL_ADDRESS.toString(),
          tokenAddress.toString(),
          lamports
        );

        const swapResult = await getJupiterSwap({
          ...quoteResponse,
          userPublicKey: userPubKey.toString(),
        });

        if (!swapResult.swapTransaction) {
          throw new Error("Failed to create swap transaction");
        }

        return Response.json(
          {
            transaction: swapResult.swapTransaction,
            message: `Transaction prepared: Buy token with ${amountParam} SOL (via Jupiter)`,
            type: "transaction",
          },
          { headers: ACTIONS_CORS_HEADERS }
        );
      } catch (error) {
        console.error("Swap error:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("POST error:", error);
    return Response.json(
      { error: String(error) },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export async function OPTIONS(request: Request) {
  return Response.json(null, { headers: ACTIONS_CORS_HEADERS });
}
