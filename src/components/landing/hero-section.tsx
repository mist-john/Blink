"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { AuroraText } from "../ui/aurora-text";
import AnimatedGradientBackground from "../ui/animated-gradient-background";
import { LineShadowText } from "../ui/line-shadow-text";
import { useTheme } from "next-themes";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { WalletButton } from "../solana/solana-provider";
import TokenForm from "@/app/components/TokenForm";

export default function HeroSection() {
  const theme = useTheme();
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const shadowColor = theme.resolvedTheme === "dark" ? "white" : "black";

  const handleClick = () => {
    if (!connected) {
      setVisible(true);
    }
    // Eğer bağlıysa başka bir işlem yapılabilir
  };

  return (
    <section
      id="hero"
      className="relative flex flex-col items-center justify-center min-h-screen text-center"
    >
      <AnimatedGradientBackground />

      <h1 className="relative z-10 bg-gradient-to-br dark:from-white from-black from-30% dark:to-white/40 to-black/40 bg-clip-text py-6 text-5xl font-medium leading-none tracking-tighter text-transparent text-balance sm:text-6xl md:text-7xl lg:text-8xl translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
        <AuroraText>Blink</AuroraText> your token
        <br className="hidden md:block leading-none tracking-tighter text-balance" />{" "}
        a few seconds
      </h1>
      <p className="relative z-10 mb-12 text-lg tracking-tight text-gray-400 md:text-xl text-balance translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
        Now you can share your on-chain transactions anywhere with a single
        blink.
        <br className="hidden md:block" /> Wherever you can drop a link, you can
        drop a blink let <AuroraText>Solana</AuroraText> transactions roam{" "}
        <LineShadowText className="italic" shadowColor={shadowColor}>
          free!
        </LineShadowText>
      </p>
      {!connected ? (
        <WalletButton />
      ) : (
        <TokenForm />
      )}
    </section>
  );
}
