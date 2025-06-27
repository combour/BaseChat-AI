"use server";

import { cookies } from "next/headers";
import { exact } from "x402/schemes";

export async function verifyPayment(payload: string): Promise<string> {
  try {
    const payment = exact.evm.decodePayment(payload);

    // Use the facilitator proxy for verification with absolute URL
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    const verifyResponse = await fetch(`${baseUrl}/api/facilitator-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", payment }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new Error(`Verification failed: ${error.error}`);
    }

    const verifyData = await verifyResponse.json();
    console.log("Payment verified successfully!", verifyData);

    const cookieStore = await cookies();
    // This should be a JWT signed by the server following best practices for a session token
    // See: https://nextjs.org/docs/app/guides/authentication#stateless-sessions
    cookieStore.set("payment-session", payload);

    return "Payment verified successfully! Session set.";
  } catch (error) {
    console.error({ error });
    return `Error: ${error}`;
  }
}

// New function to handle settlement with connected wallet
export async function settlePayment(payload: string): Promise<string> {
  try {
    const payment = exact.evm.decodePayment(payload);

    // Use the facilitator proxy for settlement with absolute URL
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    const settleResponse = await fetch(`${baseUrl}/api/facilitator-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settle", payment }),
    });

    if (!settleResponse.ok) {
      const error = await settleResponse.json();
      throw new Error(`Settlement failed: ${error.error}`);
    }

    const settleData = await settleResponse.json();
    console.log("Payment settled successfully!", settleData);

    return `Payment settled successfully! Transaction: ${settleData.transaction}`;
  } catch (error) {
    console.error({ error });
    return `Error: ${error}`;
  }
}
