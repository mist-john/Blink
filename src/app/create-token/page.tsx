"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import { Textarea } from "@/components/ui/textarea";
import { handlePumpFunLaunch } from "@/lib/lunchTokenActions";
import Link from "next/link";
import { ImagePlus, X, Loader2 } from "lucide-react";

export default function CreateTokenPage() {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const { setVisible: setModalVisible } = useWalletModal();
  
  const [isLoading, setIsLoading] = useState(false);
  const [tokenDetails, setTokenDetails] = useState({
    title: "",
    ticker: "",
    description: "",
    website: "",
    twitter: "",
    telegram: "",
  });
  const [tokenAmount, setTokenAmount] = useState<number>(100000000); // Default amount for dev wallet
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTokenDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected || !publicKey || !signTransaction || !signAllTransactions) {
      toast.error("Please connect your wallet first");
      setModalVisible(true);
      return;
    }
    
    if (!tokenDetails.title || !tokenDetails.ticker) {
      toast.error("Token name and ticker are required");
      return;
    }

    if (!selectedImage) {
      toast.error("Please upload a logo for your token");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First we need to get the image URL by uploading to IPFS via the Pump API
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('name', tokenDetails.title);
      formData.append('symbol', tokenDetails.ticker);
      formData.append('description', tokenDetails.description);
      formData.append('twitter', tokenDetails.twitter || "");
      formData.append('telegram', tokenDetails.telegram || "");
      formData.append('website', tokenDetails.website || "");
      formData.append('showName', "true");
      
      const ipfsResponse = await fetch('/api/pump/ipfs', {
        method: 'POST',
        body: formData
      });
      
      if (!ipfsResponse.ok) {
        throw new Error("Failed to upload image to IPFS");
      }
      
      const ipfsData = await ipfsResponse.json();
      const imageUrl = ipfsData.metadata?.image;
      
      if (!imageUrl) {
        throw new Error("No image URL returned from IPFS upload");
      }
      
      // Now launch the token with the image URL
      const result = await handlePumpFunLaunch({
        connection,
        publicKey,
        signTransaction,
        selectedCoin: {
          id: publicKey.toString(), // Using user wallet as ID since we're creating a new token
          title: tokenDetails.title,
          ticker: tokenDetails.ticker,
          description: tokenDetails.description,
          imageUrl: imageUrl,
          socials: {
            website: tokenDetails.website,
            twitter: tokenDetails.twitter,
            telegram: tokenDetails.telegram,
          },
        },
        anchorWallet: {
          publicKey,
          signTransaction,
          signAllTransactions,
        },
        tokenAmount,
      });
      
      // Success - token was created
      toast.success(`Token ${tokenDetails.title} (${tokenDetails.ticker}) created successfully!`);
      
      // Navigate to blink generation page with the token address
      router.push(`/create-blink/${result.contractAddress}`);
      
    } catch (error) {
      console.error("Error creating token:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create token"
      );
    } finally {
      setIsLoading(false);
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
            <CardTitle className="text-3xl font-bold">Create Your Token</CardTitle>
            <p className="text-muted-foreground">
              Fill in the details below to launch your token on Pump.fun
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Token Name*</label>
                  <Input
                    name="title"
                    placeholder="e.g., My Awesome Token"
                    value={tokenDetails.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Token Symbol/Ticker*</label>
                  <Input
                    name="ticker"
                    placeholder="e.g., MAT"
                    value={tokenDetails.ticker}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    name="description"
                    placeholder="Describe your token..."
                    value={tokenDetails.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Token Logo*</label>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    className="hidden" 
                    ref={fileInputRef}
                  />
                  
                  {!previewUrl ? (
                    <div 
                      onClick={triggerFileInput}
                      className="border-2 border-dashed border-primary/30 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <ImagePlus className="w-12 h-12 text-primary/40 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload logo (PNG, JPG, SVG)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max size: 5MB
                      </p>
                    </div>
                  ) : (
                    <div className="relative border rounded-xl overflow-hidden h-48 flex items-center justify-center">
                      <img 
                        src={previewUrl} 
                        alt="Token logo preview" 
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={clearSelectedImage}
                        className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black/90 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Website</label>
                    <Input
                      name="website"
                      placeholder="https://yourwebsite.com"
                      value={tokenDetails.website}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Twitter</label>
                    <Input
                      name="twitter"
                      placeholder="https://twitter.com/yourhandle"
                      value={tokenDetails.twitter}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Telegram</label>
                    <Input
                      name="telegram"
                      placeholder="https://t.me/yourchannel"
                      value={tokenDetails.telegram}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Developer Wallet Amount</label>
                  <Input
                    type="number"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(Number(e.target.value))}
                    min={1}
                    placeholder="Amount of tokens to allocate to developer wallet"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default total supply: 1,000,000,000</p>
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={isLoading || !connected || !selectedImage}
                className="w-full h-12"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span>Creating Token...</span>
                  </div>
                ) : (
                  <span>Launch Token</span>
                )}
              </Button>
              
              {!connected && (
                <p className="text-amber-500 text-center text-sm mt-2">
                  Please connect your wallet to create a token
                </p>
              )}
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Launch fee: 0.1 SOL</p>
                <p className="mt-1">
                  By creating a token, you agree to the{" "}
                  <Link href="#" className="text-primary hover:underline">
                    Terms of Service
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
} 