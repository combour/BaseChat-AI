import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get("txHash");
    const network = searchParams.get("network") || "base-sepolia";

    if (!txHash) {
      return NextResponse.json(
        { error: "Transaction hash is required" },
        { status: 400 }
      );
    }

    // For Base Sepolia, we can check the transaction status
    let explorerUrl = "";
    if (network === "base-sepolia") {
      explorerUrl = `https://sepolia.basescan.org/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`;
    } else {
      explorerUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`;
    }

    try {
      const response = await fetch(explorerUrl);
      const data = await response.json();

      if (data.result) {
        return NextResponse.json({
          success: true,
          transaction: {
            hash: txHash,
            from: data.result.from,
            to: data.result.to,
            value: data.result.value,
            blockNumber: data.result.blockNumber,
            status: data.result.blockNumber ? "confirmed" : "pending"
          },
          explorerUrl: network === "base-sepolia" 
            ? `https://sepolia.basescan.org/tx/${txHash}`
            : `https://etherscan.io/tx/${txHash}`
        });
      } else {
        return NextResponse.json({
          success: false,
          error: "Transaction not found",
          transaction: {
            hash: txHash,
            status: "not_found"
          }
        });
      }
    } catch (explorerError) {
      console.error("Explorer API error:", explorerError);
      return NextResponse.json({
        success: false,
        error: "Failed to check transaction status",
        transaction: {
          hash: txHash,
          status: "unknown"
        }
      });
    }
  } catch (error) {
    console.error("Transaction status API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 