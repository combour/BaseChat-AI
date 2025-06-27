"use client";

import { useState } from "react";
import { useWalletConnect } from "@/lib/hooks/useWalletConnect";
import { toast } from "sonner";
import { Send, Bot, Loader2, CheckCircle, XCircle } from "lucide-react";

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  creditsUsed: number;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
}

export function ChatInterface() {
  const { user, error, sendChatMessage } = useWalletConnect();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!user) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (user.credits < 1) {
      toast.error("Insufficient credits. Please buy more credits.");
      return;
    }

    setIsSending(true);
    const currentMessage = message;
    setMessage("");

    // Add message with sending status
    const newChatMessage: ChatMessage = {
      id: Date.now().toString(),
      message: currentMessage,
      response: "",
      creditsUsed: 0,
      timestamp: new Date(),
      status: "sending",
    };

    setChatHistory((prev) => [newChatMessage, ...prev]);

    try {
      const response = await sendChatMessage(currentMessage, 1);

      if (response) {
        // Update message with response and sent status
        setChatHistory((prev) =>
          prev.map((chat) =>
            chat.id === newChatMessage.id
              ? {
                  ...chat,
                  response: response.response,
                  creditsUsed: response.creditsUsed,
                  status: "sent",
                }
              : chat
          )
        );
        toast.success(`Message sent! Used ${response.creditsUsed} credit(s)`);
      } else {
        // Update message with error status
        setChatHistory((prev) =>
          prev.map((chat) =>
            chat.id === newChatMessage.id
              ? {
                  ...chat,
                  response: "Failed to send message",
                  status: "error",
                }
              : chat
          )
        );
        toast.error("Failed to send message");
      }
    } catch (err) {
      // Update message with error status
      setChatHistory((prev) =>
        prev.map((chat) =>
          chat.id === newChatMessage.id
            ? {
                ...chat,
                response: "Error sending message",
                status: "error",
              }
            : chat
        )
      );
      toast.error("Error sending message");
      console.error("Chat error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
        return <CheckCircle size={12} className="text-green-400" />;
      case "error":
        return <XCircle size={12} className="text-red-400" />;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center text-gray-600">
          <p>Please connect your wallet to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header with credit info */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Chat Interface</h2>
          <div className="text-right">
            <p className="text-sm">Credits: {user.credits}</p>
            <p className="text-xs opacity-75">1 credit per message</p>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4 chat-scrollbar">
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Bot size={24} className="text-blue-600" />
            </div>
            <p className="text-lg font-medium mb-2">No messages yet</p>
            <p className="text-sm">Start a conversation!</p>
          </div>
        ) : (
          chatHistory.map((chat) => (
            <div key={chat.id} className="space-y-3">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-white border border-gray-200 rounded-2xl p-3 max-w-xs shadow-sm message-bubble">
                  <p className="text-sm text-gray-900">{chat.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      {formatTime(chat.timestamp)}
                    </span>
                    {getMessageStatusIcon(chat.status)}
                  </div>
                </div>
              </div>

              {/* AI response */}
              {chat.response && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 max-w-xs shadow-sm message-bubble">
                    <p className="text-sm text-gray-900">{chat.response}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">
                        {formatTime(chat.timestamp)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {chat.creditsUsed} credit(s) used
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading indicator for messages being sent */}
              {chat.status === "sending" && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 max-w-xs shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">Sending...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-gray-200">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isSending || user.credits < 1}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 transition-all duration-200 input-focus"
          />
          <button
            onClick={handleSendMessage}
            disabled={isSending || !message.trim() || user.credits < 1}
            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center min-w-[52px] shadow-sm hover:shadow-md btn-hover"
          >
            {isSending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>

        {user.credits < 1 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-red-500" />
              <span className="text-sm text-red-700">
                No credits remaining.
                <a
                  href="/buy-credits"
                  className="text-blue-600 hover:underline ml-1 font-medium"
                >
                  Buy more credits
                </a>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
