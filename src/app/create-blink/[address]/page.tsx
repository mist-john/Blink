"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import { Metaplex } from "@metaplex-foundation/js";
import { Check, Copy, Share2 } from "lucide-react";

interface TokenMetadata {
  name: string;
  symbol: string;
  image: string;
  description: string;
}

export default function CreateBlinkPage({ params }: { params: { address: string } }) {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [blinkUrl, setBlinkUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (params.address) {
      fetchTokenMetadata(params.address);
    }
  }, [params.address, connection]);
  
  const fetchTokenMetadata = async (tokenAddress: string) => {
    try {
      setIsLoading(true);
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
      
      // Generate blink URL automatically
      generateBlink(tokenAddress);
      
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      toast.error("Failed to load token metadata");
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateBlink = async (tokenAddress: string) => {
    try {
      setIsGenerating(true);
      
      // Construct the blink URL (this will be an Actions URL)
      const origin = window.location.origin;
      const blinkUrl = `${origin}/api/blink/${tokenAddress}`;
      
      setBlinkUrl(blinkUrl);
      
      toast.success("Blink generated successfully!");
    } catch (error) {
      console.error("Error generating blink:", error);
      toast.error("Failed to generate blink");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(blinkUrl);
    setCopied(true);
    toast.success("Blink URL copied to clipboard!");
    
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };
  
  const shareLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${metadata?.name} Token Blink`,
          text: `Check out my token ${metadata?.name} (${metadata?.symbol}) on Pump.fun!`,
          url: blinkUrl,
        });
      } else {
        copyToClipboard();
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };
  
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen py-12 px-4">
      <AnimatedGradientBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10"
      >
        <Card className="bg-card/50 backdrop-blur-xl border-primary/20 shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-bold">
              {isLoading ? "Loading..." : `${metadata?.name} (${metadata?.symbol}) Blink`}
            </CardTitle>
            <p className="text-muted-foreground">
              Your token has been created and your blink is ready to share!
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 animate-spin">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {metadata?.image && (
                    <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-primary/10">
                      <img 
                        src={metadata.image} 
                        alt={metadata.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{metadata?.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{metadata?.symbol}</p>
                    <p className="text-sm mt-2">{metadata?.description}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-2">
                      {params.address}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium mb-2">Your Blink URL:</p>
                    <div className="flex items-center gap-2 bg-card/50 p-2 rounded border border-primary/20">
                      <p className="text-xs md:text-sm font-mono flex-1 truncate">{blinkUrl}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={copyToClipboard}
                        className="h-8 w-8"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={copyToClipboard}
                      className="flex-1"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Blink URL
                    </Button>
                    
                    <Button 
                      onClick={shareLink}
                      variant="outline"
                      className="flex-1"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                  
                  <Button
                    onClick={() => router.push(`/token/${params.address}`)}
                    variant="secondary"
                    className="w-full"
                  >
                    View Token Page
                  </Button>
                </div>
                
                <div className="text-center text-sm text-muted-foreground mt-4">
                  <p>
                    Your token has been launched on Pump.fun and a blink has been
                    automatically generated for you to share.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
} 