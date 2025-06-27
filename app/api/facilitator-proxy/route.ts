import { NextRequest, NextResponse } from "next/server";

const paymentRequirements = {
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

// Configuration for retry logic
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  timeoutMs: 30000, // 30 seconds (increased from 10)
};

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Calculate exponential backoff delay
function getRetryDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelay);
}

// Type for the request payload
interface FacilitatorRequestPayload {
  paymentPayload: {
    payload: {
      authorization: {
        from: string;
        to: string;
        value: string;
        validAfter: string;
        validBefore: string;
        nonce: string;
      };
      signature: string;
    };
  };
  paymentRequirements: typeof paymentRequirements;
}

// Enhanced helper function with retry logic and better error handling
async function makeFacilitatorRequest(
  url: string,
  payload: FacilitatorRequestPayload,
  retryCount = 0
): Promise<Response> {
  const bodyString = JSON.stringify(payload);

  try {
    console.log(
      `Attempting request to ${url} (attempt ${retryCount + 1}/${
        RETRY_CONFIG.maxRetries + 1
      })`
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      RETRY_CONFIG.timeoutMs
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "facilitator-proxy/1.0",
        Accept: "application/json",
        // Remove connection management headers that might cause issues
        // Connection: "keep-alive",
        // "Cache-Control": "no-cache",
      },
      body: bodyString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Log response details for debugging
    console.log(`Response from ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    return response;
  } catch (error) {
    const errorObj = error as Error;
    const errorDetails = {
      message: errorObj.message,
      name: errorObj.name,
      cause: errorObj.cause,
      url: url,
      payloadSize: Buffer.byteLength(bodyString, "utf8"),
      attempt: retryCount + 1,
      maxRetries: RETRY_CONFIG.maxRetries + 1,
    };

    console.error("Fetch error details:", errorDetails);

    // Determine if we should retry
    const isRetryableError =
      errorObj.name === "TimeoutError" ||
      errorObj.name === "AbortError" ||
      errorObj.message.includes("timeout") ||
      errorObj.message.includes("network") ||
      errorObj.message.includes("ECONNRESET") ||
      errorObj.message.includes("ENOTFOUND") ||
      errorObj.message.includes("fetch failed") ||
      (errorObj.cause as { code?: string })?.code ===
        "UND_ERR_REQ_CONTENT_LENGTH_MISMATCH";

    if (isRetryableError && retryCount < RETRY_CONFIG.maxRetries) {
      const delayMs = getRetryDelay(retryCount);
      console.log(`Retrying in ${delayMs}ms...`);
      await delay(delayMs);
      return makeFacilitatorRequest(url, payload, retryCount + 1);
    }

    // Enhance error with retry information
    const enhancedError = new Error(
      `${errorObj.message} (failed after ${retryCount + 1} attempts)`
    );
    enhancedError.name = errorObj.name;
    enhancedError.cause = errorDetails;
    throw enhancedError;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payment } = body;

    if (!payment) {
      return NextResponse.json(
        { error: "No payment provided" },
        { status: 400 }
      );
    }

    // Validate payment - should be either an encoded string or a PaymentPayload object
    let paymentPayload: {
      payload: {
        authorization: {
          from: string;
          to: string;
          value: string;
          validAfter: string;
          validBefore: string;
          nonce: string;
        };
        signature: string;
      };
    };

    if (typeof payment === "string") {
      // Payment is an encoded string, we need to decode it
      const { exact } = await import("x402/schemes");
      paymentPayload = exact.evm.decodePayment(payment);
    } else if (
      payment.payload &&
      payment.payload.authorization &&
      payment.payload.signature
    ) {
      // Payment is already a PaymentPayload object
      paymentPayload = payment;
    } else {
      return NextResponse.json(
        {
          error:
            "Payment must be an encoded string or valid PaymentPayload object",
        },
        { status: 400 }
      );
    }

    const requestPayload: FacilitatorRequestPayload = {
      paymentPayload,
      paymentRequirements: paymentRequirements,
    };

    // Log payload for debugging (remove in production)
    console.log("Request payload:", JSON.stringify(requestPayload, null, 2));
    console.log("Payment validation:", {
      isString: typeof payment === "string",
      hasPayload: !!paymentPayload.payload,
      hasAuthorization: !!paymentPayload.payload?.authorization,
      hasSignature: !!paymentPayload.payload?.signature,
      authorizationKeys: paymentPayload.payload?.authorization
        ? Object.keys(paymentPayload.payload.authorization)
        : [],
    });

    if (action === "verify") {
      console.log("Verifying payment via direct facilitator call...");

      try {
        const verifyResponse = await makeFacilitatorRequest(
          "https://www.x402.org/facilitator/verify",
          requestPayload
        );

        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text();
          let errorData;

          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }

          console.error("Facilitator verify error:", {
            status: verifyResponse.status,
            statusText: verifyResponse.statusText,
            error: errorData,
            headers: Object.fromEntries(verifyResponse.headers.entries()),
          });

          return NextResponse.json(
            {
              success: false,
              error: "Payment verification failed",
              details: errorData,
              status: verifyResponse.status,
            },
            { status: verifyResponse.status >= 500 ? 502 : 400 }
          );
        }

        const valid = await verifyResponse.json();
        console.log("Verification successful:", valid);
        return NextResponse.json({ success: true, valid });
      } catch (fetchError) {
        const errorObj = fetchError as Error;
        console.error("Verify fetch failed:", errorObj);
        return NextResponse.json(
          {
            success: false,
            error: "Network error during verification",
            details: errorObj.message,
            retryAfter: 5, // Suggest client retry after 5 seconds
          },
          {
            status: 503,
            headers: {
              "Retry-After": "5",
            },
          }
        );
      }
    }

    if (action === "settle") {
      console.log("Settling payment via direct facilitator call...");
      console.log("Payment payload:", JSON.stringify(paymentPayload, null, 2));

      try {
        const settleResponse = await makeFacilitatorRequest(
          "https://www.x402.org/facilitator/settle",
          requestPayload
        );

        const settleData = await settleResponse.json();
        console.log("Full settleData:", JSON.stringify(settleData, null, 2));
        console.log("Transaction hash:", settleData.transaction);
        console.log("Network:", settleData.network);

        // Only treat as success if settleData.success is true
        if (!settleData.success) {
          return NextResponse.json(
            {
              success: false,
              error: "Payment settlement failed",
              details: settleData,
              status: settleResponse.status,
            },
            { status: settleResponse.status >= 500 ? 502 : 400 }
          );
        }

        // Add credits to user account after successful settlement
        let creditsAdded = 0;
        let paymentRecord = null;
        try {
          const fromAddress = paymentPayload.payload.authorization.from;
          const paymentAmount = paymentPayload.payload.authorization.value;
          // Calculate credits to add (10 credits per $0.01 = 1000 wei per credit)
          const creditsToAdd = Math.floor(parseInt(paymentAmount) / 1000);
          creditsAdded = creditsToAdd;
          console.log("Adding credits:", {
            fromAddress,
            paymentAmount,
            creditsToAdd,
          });

          const creditResponse = await fetch(
            `${req.nextUrl.origin}/api/credits`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                address: fromAddress,
                amount: parseInt(paymentAmount), // Send original payment amount, not calculated credits
                type: "payment_success",
              }),
            }
          );

          console.log("Credit API response status:", creditResponse.status);

          if (creditResponse.ok) {
            const creditData = await creditResponse.json();
            console.log("Credits added successfully:", creditData);
          } else {
            const errorText = await creditResponse.text();
            console.error("Failed to add credits:", errorText);
          }

          // Store payment in the database
          // Find user by address
          const user = await import("@/lib/prisma").then((m) =>
            m.prisma.user.findUnique({
              where: { address: fromAddress.toLowerCase() },
            })
          );
          if (user) {
            paymentRecord = await import("@/lib/prisma").then((m) =>
              m.prisma.payment.create({
                data: {
                  transactionHash: settleData.transaction,
                  amount: paymentAmount,
                  to: paymentPayload.payload.authorization.to,
                  network: settleData.network || "base-sepolia",
                  userId: user.id,
                },
              })
            );
            console.log("Payment record created:", paymentRecord);
          } else {
            console.error("User not found for payment record");
          }
        } catch (creditError) {
          console.error(
            "Error adding credits or storing payment:",
            creditError
          );
        }

        return NextResponse.json({
          success: true,
          transaction: settleData.transaction,
          network: settleData.network,
          creditsAdded,
          facilitatorResponse: settleData,
        });
      } catch (fetchError) {
        const errorObj = fetchError as Error;
        console.error("Settle fetch failed:", errorObj);
        return NextResponse.json(
          {
            success: false,
            error: "Network error during settlement",
            details: errorObj.message,
            retryAfter: 5,
          },
          {
            status: 503,
            headers: {
              "Retry-After": "5",
            },
          }
        );
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const errorObj = error as Error;
    console.error("Facilitator proxy error:", errorObj);
    return NextResponse.json(
      {
        error: "Facilitator request failed",
        details: errorObj.message,
      },
      { status: 500 }
    );
  }
}
