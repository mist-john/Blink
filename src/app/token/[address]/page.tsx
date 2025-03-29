"use client";

import { PublicKey } from "@solana/web3.js";
import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Transaction } from "@solana/web3.js";
import { toast } from "sonner";
import { Metaplex } from "@metaplex-foundation/js";

// Phantom wallet tipi
declare global {
  interface Window {
    solana?: {
      connect(): Promise<{ publicKey: PublicKey }>;
      disconnect(): Promise<void>;
      signAndSendTransaction(
        transaction: string
      ): Promise<{ signature: string }>;
    };
  }
}

interface TokenMetadata {
  name: string;
  symbol: string;
  image: string;
  description: string;
}

interface TokenStatus {
  isActive: boolean;
  token?: TokenMetadata;
}

interface TokenDetails {
  isActive: boolean;
  token?: {
    address: string;
    name?: string;
    symbol?: string;
    image?: string;
    description?: string;
  };
}

export default function TokenPage({ params }: { params: { address: string } }) {
  const { connection } = useConnection();
  const { signTransaction, publicKey, connected, signMessage } = useWallet();
  const { setVisible: setModalVisible } = useWalletModal();

  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<string>("0.1");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const fetchMetaplexMetadata = async (tokenAddress: string) => {
    try {
      const metaplex = new Metaplex(connection);
      const mint = new PublicKey(tokenAddress);

      const nft = await metaplex.nfts().findByMint({ mintAddress: mint });

      if (!nft) {
        throw new Error("Token metadata not found");
      }

      setMetadata({
        name: nft.name,
        symbol: nft.symbol,
        image: nft.json?.image || "",
        description: nft.json?.description || "",
      });

      console.log("Metadata loaded:", nft);
    } catch (error) {
      console.error("Error fetching Metaplex metadata:", error);
      toast.error("Failed to load token metadata");
    }
  };

  const checkTokenAndFetchMetadata = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/tokens/check?address=${params.address}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check token");
      }

      setTokenDetails(data);

      if (data.isActive) {
        await fetchMetaplexMetadata(params.address);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to check token"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkTokenAndFetchMetadata();
  }, [params.address, connection]);

  const handleActivate = async () => {
    try {
      if (!connected || !publicKey || !signMessage) {
        setModalVisible(true);
        return;
      }

      setIsLoading(true);

      // Aktivasyon mesajı oluştur
      const message = `Token activation request for ${
        params.address
      }\nTimestamp: ${new Date().toISOString()}`;
      const encodedMessage = new TextEncoder().encode(message);

      // Mesajı imzala
      const signature = await signMessage(encodedMessage);
      const signatureBase64 = Buffer.from(signature).toString("base64");

      // İmzayı backend'e gönder
      const response = await fetch("/api/tokens/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: params.address,
          message,
          signature: signatureBase64,
          publicKey: publicKey.toString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to activate token");
      }

      toast.success("Token activated successfully");
      checkTokenAndFetchMetadata();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to activate token"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuy = async (amount: string = selectedAmount) => {
    try {
      if (!connected) {
        setModalVisible(true);
        return;
      }

      if (!publicKey || !signTransaction) {
        toast.error("Please connect your wallet first");
        return;
      }

      setIsLoading(true);
      setError(null);

      const toastId = toast.loading("Preparing transaction...");

      const response = await fetch(
        `/api/blink/${params.address}?action=buy&amount=${amount}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account: publicKey.toString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Transaction failed", { id: toastId });
        throw new Error(data.error || "Transaction failed");
      }

      toast.loading("Signing transaction...", { id: toastId });

      // Transaction'ı deserialize et
      const transaction = Transaction.from(
        Buffer.from(data.transaction, "base64")
      );

      // Transaction'ı imzala
      const signedTransaction = await signTransaction(transaction);

      toast.loading("Sending transaction...", { id: toastId });

      // İmzalı transaction'ı gönder
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      toast.loading("Confirming transaction...", { id: toastId });

      // Transaction'ın onaylanmasını bekle
      await connection.confirmTransaction(signature, "confirmed");

      console.log("Transaction successful:", signature);
      toast.success("Transaction successful!", {
        id: toastId,
        description: `Signature: ${signature.slice(0, 8)}...${signature.slice(
          -8
        )}`,
        duration: 5000,
        action: {
          label: "View",
          onClick: () =>
            window.open(`https://solscan.io/tx/${signature}`, "_blank"),
        },
      });
    } catch (err) {
      console.error("Buy error:", err);
      toast.error(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen  p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
        <div className="text-gray-300 animate-pulse">
          Loading token details...
        </div>
      </div>
    );
  }

  if (!tokenDetails?.isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full rounded-2xl shadow-xl p-8 border border-gray-700">
          <div className="w-20 h-20 mx-auto mb-6 bg-purple-900/30 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-purple-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            Token Not Active
          </h2>
          <p className="text-gray-400 text-center mb-8">
            This token needs to be activated before it can be traded on our
            platform.
          </p>
          <div className="bg-[#2D3B55] rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-400 mb-2">Token Address</p>
            <p className="font-mono text-sm text-gray-300 break-all bg-[#1E293B] p-3 rounded-lg">
              {params.address}
            </p>
          </div>

          <button
            onClick={() => handleActivate()}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white py-4 px-6 rounded-xl
              transition-all duration-200 flex items-center justify-center space-x-3 
              hover:from-purple-700 hover:to-purple-900
              disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 
              focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#1E293B] shadow-lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                <span className="text-lg">Activating...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-lg">Activate</span>
              </>
            )}
          </button>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Once activated, you&apos;ll be able to trade this token
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-12 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto rounded-2xl shadow-xl overflow-hidden border border-gray-700">
        {metadata?.image && (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <img
              src={metadata.image}
              alt={metadata.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            {metadata?.name}
          </h1>
          <div className="space-y-4 mb-8">
            <div className="flex items-center p-3 bg-[#2D3B55] rounded-lg">
              <span className="text-gray-400 font-medium w-24">Symbol</span>
              <span className="text-white font-mono">{metadata?.symbol}</span>
            </div>
            <div className="flex items-start p-3 bg-[#2D3B55] rounded-lg">
              <span className="text-gray-400 font-medium w-24">Address</span>
              <span className="text-white font-mono text-sm break-all">
                {params.address}
              </span>
            </div>
            {metadata?.description && (
              <div className="p-3 bg-[#2D3B55] rounded-lg">
                <span className="text-gray-400 font-medium block mb-2">
                  Description
                </span>
                <span className="text-white">{metadata.description}</span>
              </div>
            )}
          </div>
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg">
              {error}
            </div>
          )}

          {/* Amount Selection */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-400 block mb-2">
              Select Purchase Amount
            </label>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {["0.1", "0.5", "1"].map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedAmount(amount);
                  }}
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    selectedAmount === amount
                      ? "bg-purple-600 text-white"
                      : "bg-[#2D3B55] text-gray-300 hover:bg-purple-600/20"
                  }`}
                >
                  {amount} SOL
                </button>
              ))}
            </div>

            <div className="mb-6">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount("");
                }}
                placeholder="Enter custom SOL amount"
                className="w-full p-3 bg-[#2D3B55] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                step="0.01"
                min="0.1"
              />
            </div>
          </div>

          <button
            onClick={() => handleBuy(selectedAmount || customAmount || "0.1")}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white py-4 px-6 rounded-xl
              transition-all duration-200 flex items-center justify-center space-x-3
              hover:from-purple-700 hover:to-purple-900
              disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 
              focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#1E293B] shadow-lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                <span className="text-lg">Processing...</span>
              </>
            ) : !connected ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="text-lg">Connect Wallet</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-lg">
                  Buy {metadata?.symbol} for{" "}
                  {selectedAmount || customAmount || "0.1"} SOL
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
