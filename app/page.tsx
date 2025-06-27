"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { useAccount } from "wagmi";
import { Toaster, toast } from "sonner";
import { PaymentRequirements } from "x402/types";
import { preparePaymentHeader } from "x402/client";
import { getNetworkId } from "x402/shared";
import { exact } from "x402/schemes";
import { useSignTypedData } from "wagmi";
import { verifyPayment, settlePayment } from "@/lib/actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
}

interface User {
  id: number;
  address: string;
  credits: number;
  createdAt: string;
}

interface Payment {
  id: number;
  transactionHash: string;
  amount: string;
  createdAt: string;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  address: string | undefined;
  isConnected: boolean;
  refreshCredits: () => void;
}

function PaymentModal({
  open,
  onClose,
  address,
  isConnected,
  refreshCredits,
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState("");
  const [verificationResult, setVerificationResult] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const paymentRequirements: PaymentRequirements = {
    scheme: "exact",
    network: "base-sepolia",
    maxAmountRequired: "10000",
    resource: "https://paytochat.vercel.app",
    description: "Payment To Buy Credits",
    mimeType: "text/html",
    payTo: "0xEAde2298C7d1b5C748103da66D6Dd9Cf204E2AD2",
    maxTimeoutSeconds: 300,
    asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    outputSchema: undefined,
    extra: {
      name: "USDC",
      version: "2",
    },
  };

  useEffect(() => {
    if (address && isConnected && open) {
      fetchUserData();
      fetchPaymentHistory();
    } else {
      setUser(null);
      setPaymentHistory([]);
    }
    // eslint-disable-next-line
  }, [address, isConnected, open]);

  const fetchUserData = async () => {
    if (!address) return;
    setIsLoadingUser(true);
    try {
      const response = await fetch(`/api/credits?address=${address}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user as User);
      } else {
        console.error("Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!address) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/payments?address=${address}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.payments || []);
      } else {
        setPaymentHistory([]);
      }
    } catch {
      setPaymentHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const unSignedPaymentHeader = preparePaymentHeader(
    address as `0x${string}`,
    1,
    paymentRequirements
  );

  const eip712Data = {
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    domain: {
      name: paymentRequirements.extra?.name,
      version: paymentRequirements.extra?.version,
      chainId: getNetworkId(paymentRequirements.network),
      verifyingContract: paymentRequirements.asset as `0x${string}`,
    },
    primaryType: "TransferWithAuthorization" as const,
    message: {
      from: unSignedPaymentHeader.payload.authorization.from as `0x${string}`,
      to: unSignedPaymentHeader.payload.authorization.to as `0x${string}`,
      value: BigInt(unSignedPaymentHeader.payload.authorization.value),
      validAfter: BigInt(
        unSignedPaymentHeader.payload.authorization.validAfter
      ),
      validBefore: BigInt(
        unSignedPaymentHeader.payload.authorization.validBefore
      ),
      nonce: unSignedPaymentHeader.payload.authorization.nonce as `0x${string}`,
    },
  };

  const { isError, isSuccess, signTypedDataAsync } = useSignTypedData();

  async function handleTestAction() {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }
    setIsProcessing(true);
    setResult("");
    setVerificationResult("");
    try {
      const signature = await signTypedDataAsync(eip712Data);
      const paymentPayload = {
        ...unSignedPaymentHeader,
        payload: {
          ...unSignedPaymentHeader.payload,
          signature,
        },
      };
      const payment = exact.evm.encodePayment(paymentPayload);
      const verifyResult = await verifyPayment(payment);
      setVerificationResult(verifyResult);
      if (verifyResult.startsWith("Error:")) {
        toast.error(`Verification failed: ${verifyResult}`);
        setResult("Verification failed - stopping here");
        return;
      }
      toast.success("Payment verified successfully! Now settling...");
      const settleResult = await settlePayment(payment);
      setResult(settleResult);
      if (settleResult.startsWith("Error:")) {
        toast.error(`Settlement failed: ${settleResult}`);
      } else {
        toast.success(
          "Payment settled successfully! Credits added to your account."
        );
        setTimeout(() => {
          fetchUserData();
          refreshCredits();
        }, 2000);
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setResult(`Error: ${errorMessage}`);
      toast.error(`Action test failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#181f2a] text-white rounded-2xl shadow-2xl max-w-md w-full p-0 border border-[#232b36] relative">
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl font-bold"
            aria-label="Close"
            style={{ lineHeight: 1 }}
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-1 text-white">Buy Credits</h2>
          <p className="text-gray-300 mb-4 text-sm">
            Purchase credits to use in the chat system
          </p>
          <div className="mb-4 space-y-2">
            <div className="bg-blue-700 p-3 rounded-lg text-white text-center">
              {isLoadingUser ? (
                <span>Loading user data...</span>
              ) : user ? (
                <>
                  <span className="text-sm">Your Credits</span>
                  <div className="text-2xl font-bold">{user.credits}</div>
                  <span className="text-xs opacity-70">
                    Member since {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </>
              ) : (
                <span className="text-sm">
                  New user - credits will be added after payment
                </span>
              )}
            </div>
            <div className="bg-[#232b36] p-3 rounded-lg text-gray-200 text-center">
              <div className="text-base font-medium">
                Buy credits with 0.01 USDC
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {paymentRequirements.description}
              </div>
              <div className="text-xs text-green-400 mt-2">
                💡 10 credits per $0.01 USDC
              </div>
            </div>
          </div>
          <button
            disabled={!isConnected || isProcessing}
            onClick={handleTestAction}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors mb-2 text-base"
          >
            {isProcessing ? "Processing Payment..." : "Buy Credits"}
          </button>
          {isProcessing && (
            <p className="text-center text-sm text-gray-400">
              Processing payment...
            </p>
          )}
          {isSuccess && (
            <p className="text-center bg-green-700 text-white text-sm rounded-lg py-2 my-2">
              Payment signed successfully!
            </p>
          )}
          {isError && (
            <p className="text-center bg-red-700 text-white text-sm rounded-lg py-2 my-2">
              Payment signing failed
            </p>
          )}
          {verificationResult && (
            <div className="bg-[#232b36] p-3 rounded-lg text-left mt-3">
              <h3 className="font-semibold mb-1 text-white">
                Verification Result:
              </h3>
              <pre className="text-xs text-gray-200 whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                {verificationResult}
              </pre>
            </div>
          )}
          {result && (
            <div className="bg-[#232b36] p-3 rounded-lg text-left mt-3">
              <h3 className="font-semibold mb-1 text-white">
                Settlement Result:
              </h3>
              <pre className="text-xs text-gray-200 whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                {result}
              </pre>
            </div>
          )}
          {/* Payment History Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2 text-white">
              Payment History
            </h3>
            <div className="bg-[#232b36] rounded-lg p-3 max-h-48 overflow-y-auto">
              {isLoadingHistory ? (
                <div className="text-gray-400 text-sm">Loading history...</div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-gray-500 text-sm">No payments yet.</div>
              ) : (
                <ul className="space-y-2">
                  {paymentHistory.map((p) => (
                    <li key={p.id} className="flex flex-col gap-1">
                      <a
                        href={`https://sepolia.basescan.org/tx/${p.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline break-all text-xs font-mono"
                      >
                        {p.transactionHash}
                      </a>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>
                          {new Date(p.createdAt).toLocaleDateString()}{" "}
                          {new Date(p.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-green-400 font-semibold">
                          0.01 USDC
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isConnected, address } = useAccount();
  // const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const registerUser = async () => {
    if (isConnected && address) {
      try {
        const res = await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const data = await res.json();
        setCredits(data.credits);
      } catch (err) {
        console.error("Error registering user:", err);
        setCredits(null);
      }
    } else {
      setCredits(null);
    }
  };

  // Refresh credits function
  const refreshCredits = async () => {
    if (isConnected && address) {
      try {
        const res = await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const data = await res.json();
        setCredits(data.credits);
      } catch (err) {
        console.error("Error refreshing credits:", err);
      }
    }
  };

  useEffect(() => {
    registerUser();
  }, [isConnected, address]);

  // Refresh credits when returning from buy-credits page
  useEffect(() => {
    const handleFocus = () => {
      refreshCredits();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isConnected, address]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [prompt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    if (typeof credits === "number" && credits <= 0) {
      toast.error("Not enough credits! Please top up to continue.");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt.trim(),
      timestamp: new Date(),
      status: "sending",
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          address,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          setCredits(0);
          toast.error("Not enough credits! Please top up to continue.");
        } else {
          toast.error("Failed to get response from AI.");
        }
        throw new Error("Failed to get response");
      }

      setCredits((c) => (typeof c === "number" ? c - 1 : c));
      const data = await response.json();

      // Update user message status to sent
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: "sent" } : msg
        )
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        status: "sent",
      };

      setMessages((prev) => [...prev, assistantMessage]);
      toast.success("Message sent successfully!");
      setIsLoading(false);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Something went wrong. Please try again.");

      // Update user message status to error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: "error" } : msg
        )
      );

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        status: "error",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case "sending":
        return <Loader2 size={12} className="animate-spin text-blue-400" />;
      case "sent":
        return <div className="w-2 h-2 bg-green-400 rounded-full" />;
      case "error":
        return <AlertCircle size={12} className="text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        address={address}
        isConnected={isConnected}
        refreshCredits={refreshCredits}
      />
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        {/* Enhanced Top bar */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700/50 bg-gray-800/30 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {/* <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div> */}
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="12" fill="#0052FF" />
                <ellipse cx="20" cy="20" rx="12" ry="10" fill="white" />
                <path
                  d="M16 18h8M16 22h5"
                  stroke="#0052FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="28" cy="14" r="2" fill="#FFD600" />
              </svg>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                BaseChat AI
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg">
              <CreditCard size={16} className="text-green-400" />
              <span className="text-sm font-medium">
                {credits ?? 0} credits
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2"
              >
                <CreditCard size={14} />
                Buy Credits
              </button>
            </div>
          </div>

          <ConnectButton />
        </div>

        {/* Enhanced Chat area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full mb-6">
                    <Bot size={40} className="text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Welcome to BaseChat AI
                  </h2>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Connect your wallet and start chatting with AI. Each message
                    costs 1 credit.
                  </p>
                  {!isConnected && (
                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-300 text-sm">
                        Please connect your wallet to start chatting
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 mb-1 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                        <Bot size={16} className="text-white" />
                      </div>
                    )}

                    <div
                      className={`max-w-xs rounded-lg px-3 py-2 relative group text-sm flex flex-col ${
                        message.role === "user"
                          ? "bg-[#232b36] text-white border border-[#232b36]"
                          : "bg-[#232b36] text-white border border-[#232b36]"
                      } ${
                        message.status === "error" ? "border-red-500/50" : ""
                      }`}
                    >
                      <span className="whitespace-pre-wrap break-words">
                        {message.content}
                      </span>
                      <div className="flex items-center gap-1 justify-end mt-1 text-xs opacity-70">
                        <span>{formatTime(message.timestamp)}</span>
                        {message.role === "user" &&
                          getMessageStatusIcon(message.status)}
                      </div>
                    </div>

                    {message.role === "user" && (
                      <div className="flex-shrink-0 w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center">
                        <User size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Enhanced Input area */}
          <div className="border-t border-gray-700/50 bg-gray-800/30 backdrop-blur-md">
            <div className="max-w-4xl mx-auto p-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    className="w-full rounded-xl bg-gray-700/50 border border-gray-600/50 px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[52px] max-h-32 transition-all duration-200"
                    placeholder={
                      !isConnected
                        ? "Connect wallet to start chatting..."
                        : "Type your message... (Shift + Enter for new line)"
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading || !isConnected}
                    rows={1}
                  />
                  {!isConnected && (
                    <div className="absolute inset-0 bg-gray-800/50 rounded-xl flex items-center justify-center">
                      <span className="text-gray-400 text-sm">
                        Connect wallet to chat
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!prompt.trim() || isLoading || !isConnected}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center min-w-[52px] shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </form>

              {/* Credit warning */}
              {typeof credits === "number" && credits <= 0 && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-400" />
                    <span className="text-red-300 text-sm">
                      No credits remaining. Please buy more credits to continue
                      chatting.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
