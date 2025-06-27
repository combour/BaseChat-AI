import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";

interface User {
  id: number;
  address: string;
  credits: number;
  createdAt: string;
  topups?: [];
  payments?: [];
}

interface ChatResponse {
  success: boolean;
  response: string;
  user: User;
  creditsUsed: number;
}

interface UseWalletConnectReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshUser: () => Promise<void>;
  addCredits: (amount: number) => Promise<void>;
  useCredits: (amount: number) => Promise<void>;
  sendChatMessage: (
    message: string,
    creditsRequired?: number
  ) => Promise<ChatResponse | null>;
  getChatCredits: () => Promise<number | null>;
}

export function useWalletConnect(): UseWalletConnectReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const connectWallet = async () => {
    if (!address) {
      setError("No wallet address found");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/wallet-connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
      } else {
        setError(data.error || "Failed to connect wallet");
      }
    } catch (err) {
      setError("Failed to connect wallet");
      console.error("Wallet connect error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setUser(null);
    setError(null);
    disconnect();
  };

  const refreshUser = async () => {
    if (!user?.address) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/wallet-connect?address=${user.address}`
      );
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
      } else {
        setError(data.error || "Failed to refresh user data");
      }
    } catch (err) {
      setError("Failed to refresh user data");
      console.error("Refresh user error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addCredits = async (amount: number) => {
    if (!user?.id) {
      setError("User not connected");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: user.address,
          amount,
          type: "topup",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUser((prev) =>
          prev ? { ...prev, credits: data.user.credits } : null
        );
      } else {
        setError(data.error || "Failed to add credits");
      }
    } catch (err) {
      setError("Failed to add credits");
      console.error("Add credits error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const useCredits = async (amount: number) => {
    if (!user?.id) {
      setError("User not connected");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: user.address,
          amount,
          type: "use",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUser((prev) =>
          prev ? { ...prev, credits: data.user.credits } : null
        );
      } else {
        setError(data.error || "Failed to use credits");
      }
    } catch (err) {
      setError("Failed to use credits");
      console.error("Use credits error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendChatMessage = async (
    message: string,
    creditsRequired: number = 1
  ): Promise<ChatResponse | null> => {
    if (!user?.address) {
      setError("User not connected");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: user.address,
          message,
          creditsRequired,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUser((prev) =>
          prev ? { ...prev, credits: data.user.credits } : null
        );
        return data;
      } else {
        setError(data.error || "Failed to send chat message");
        return null;
      }
    } catch (err) {
      setError("Failed to send chat message");
      console.error("Chat message error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getChatCredits = async (): Promise<number | null> => {
    if (!user?.address) {
      return null;
    }

    try {
      const response = await fetch(`/api/chat?address=${user.address}`);
      const data = await response.json();

      if (data.success) {
        return data.credits;
      } else {
        return null;
      }
    } catch (err) {
      console.error("Get chat credits error:", err);
      return null;
    }
  };

  // Auto-connect when wallet is connected
  useEffect(() => {
    if (isConnected && address && !user) {
      connectWallet();
    } else if (!isConnected && user) {
      disconnectWallet();
    }
  }, [isConnected, address, user]);

  return {
    user,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    refreshUser,
    addCredits,
    useCredits,
    sendChatMessage,
    getChatCredits,
  };
}
