"use client";

import {  WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "viem/chains";

// const { chain, rpcUrl } = getNetworkConfig();

// export const wagmiConfig = createConfig({
//   chains: [chain],
//   transports: {
//     [chain.id]: http(rpcUrl),
//   },
//   connectors: [coinbaseWallet()],
// });
const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [baseSepolia],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
