import React from "react";

interface ChatLoadingSkeletonProps {
  messageCount?: number;
}

export function ChatLoadingSkeleton({
  messageCount = 3,
}: ChatLoadingSkeletonProps) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: messageCount }).map((_, index) => (
        <div
          key={index}
          className={`flex gap-3 ${
            index % 2 === 0 ? "justify-start" : "justify-end"
          }`}
        >
          {index % 2 === 0 && (
            <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full" />
          )}

          <div
            className={`max-w-[75%] rounded-2xl px-4 py-3 ${
              index % 2 === 0
                ? "bg-gray-700/50 border border-gray-600/30"
                : "bg-blue-600/50"
            }`}
          >
            <div className="space-y-2">
              <div className="h-4 bg-gray-600/50 rounded w-full" />
              <div className="h-4 bg-gray-600/50 rounded w-3/4" />
              {index % 3 === 0 && (
                <div className="h-4 bg-gray-600/50 rounded w-1/2" />
              )}
            </div>
            <div className="mt-2 h-3 bg-gray-600/30 rounded w-16" />
          </div>

          {index % 2 === 1 && (
            <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full" />
          )}
        </div>
      ))}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
        <div className="w-4 h-4 bg-white rounded-full" />
      </div>
      <div className="bg-gray-700/50 border border-gray-600/30 rounded-2xl px-4 py-3 shadow-md">
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
          <span className="text-gray-400 text-sm">AI is thinking...</span>
        </div>
      </div>
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 justify-start animate-pulse">
      <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full" />
      <div className="bg-gray-700/50 border border-gray-600/30 rounded-2xl px-4 py-3 max-w-[75%]">
        <div className="space-y-2">
          <div className="h-4 bg-gray-600/50 rounded w-full" />
          <div className="h-4 bg-gray-600/50 rounded w-3/4" />
          <div className="h-4 bg-gray-600/50 rounded w-1/2" />
        </div>
        <div className="mt-2 h-3 bg-gray-600/30 rounded w-16" />
      </div>
    </div>
  );
}

export function InputSkeleton() {
  return (
    <div className="border-t border-gray-700/50 bg-gray-800/30 backdrop-blur-md">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="w-full h-[52px] bg-gray-700/50 border border-gray-600/50 rounded-xl" />
          </div>
          <div className="w-[52px] h-[52px] bg-gray-600 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
