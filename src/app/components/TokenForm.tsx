"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { AIInputWithFile } from "@/components/ui/ai-input-with-file";

export default function TokenForm() {
  const router = useRouter();
  const { publicKey, connected, signMessage } = useWallet();
  const { setVisible: setModalVisible } = useWalletModal();
  const [tokenCA, setTokenCA] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleTokenSubmit = async (address: string) => {
    if (!address) {
      toast.error("Please enter a token address");
      return;
    }

    setTokenCA(address);
    setIsChecking(true);
    try {
      const response = await fetch(`/api/tokens/check?address=${address}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check token");
      }

      if (!data.isActive) {
        toast.message("Token Activation Required", {
          description:
            "This token needs to be activated. Please approve the wallet signature.",
          cancel: {
            label: "Cancel",
            onClick: () => router.push("/"),
          },
          duration: 5000,
        });

        if (!connected || !publicKey || !signMessage) {
          setModalVisible(true);
          return;
        }

        setIsLoading(true);
        const messageToSign = `Token activation request for ${address}\nTimestamp: ${new Date().toISOString()}`;
        const encodedMessage = new TextEncoder().encode(messageToSign);
        const signature = await signMessage(encodedMessage);
        const signatureBase64 = Buffer.from(signature).toString("base64");

        const activateResponse = await fetch("/api/tokens/activate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address,
            message: messageToSign,
            signature: signatureBase64,
            publicKey: publicKey.toString(),
          }),
        });

        const activateData = await activateResponse.json();

        if (!activateResponse.ok) {
          throw new Error(activateData.error || "Failed to activate token");
        }

        toast.success("Token activated successfully");
      }

      router.push(`/token/${address}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process token"
      );
    } finally {
      setIsLoading(false);
      setIsChecking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTokenSubmit(tokenCA);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center w-full"
    >
      <div className="w-full max-w-lg px-4">
        <Card className="bg-card/50 backdrop-blur-xl border-primary/20 shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-3xl text-left font-bold">
              Blink Activation
            </CardTitle>
            <p className="text-muted-foreground text-md text-left">
              Enter a contract address to activate your blink.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <AIInputWithFile
                  id="tokenCA"
                  placeholder="Contract address..."
                  onSubmit={handleTokenSubmit}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || isChecking}
                className="w-full h-12"
              >
                {isChecking || isLoading ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-6 h-6">
                      <svg className="animate-spin" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-3">
                    
                    <span>Activate</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
