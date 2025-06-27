import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { address, amount, type } = await req.json();

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Normalize address to lowercase to prevent case sensitivity issues
    const normalizedAddress = address.toLowerCase();

    // Use upsert to prevent race conditions and duplicate entries
    const user = await prisma.user.upsert({
      where: { address: normalizedAddress },
      update: {}, // Don't update anything if user exists
      create: {
        address: normalizedAddress,
        credits: 0,
      },
    });

    if (type === "topup") {
      if (!amount || typeof amount !== "number" || amount <= 0) {
        return NextResponse.json(
          { error: "Valid amount is required for topup" },
          { status: 400 }
        );
      }

      // Add credits to user account
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          credits: {
            increment: amount,
          },
          topups: {
            create: {
              amount: amount,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          address: updatedUser.address,
          credits: updatedUser.credits,
        },
      });
    } else if (type === "use") {
      if (!amount || typeof amount !== "number" || amount <= 0) {
        return NextResponse.json(
          { error: "Valid amount is required for credit usage" },
          { status: 400 }
        );
      }

      if (user.credits < amount) {
        return NextResponse.json(
          { error: "Insufficient credits" },
          { status: 400 }
        );
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          credits: {
            decrement: amount,
          },
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          address: updatedUser.address,
          credits: updatedUser.credits,
        },
      });
    } else if (type === "payment_success") {
      // Handle successful payment - add credits based on payment amount
      console.log(
        "Payment success - received amount:",
        amount,
        "type:",
        typeof amount
      );

      // The amount should be in wei (smallest unit)
      // 1 USDC = 1,000,000 (6 decimals)
      // We want 10 credits per $0.01, so 10 credits per 10,000 wei (0.01 * 1,000,000)
      // Therefore: 1 credit per 1,000 wei
      let creditsToAdd = 0;

      if (typeof amount === "string") {
        creditsToAdd = Math.floor(parseInt(amount) / 1000);
      } else if (typeof amount === "number") {
        creditsToAdd = Math.floor(amount / 1000);
      } else {
        console.error("Invalid amount type:", typeof amount);
        return NextResponse.json(
          { error: "Invalid amount format" },
          { status: 400 }
        );
      }

      console.log(
        "Calculated credits to add:",
        creditsToAdd,
        "from amount:",
        amount
      );

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          credits: {
            increment: creditsToAdd,
          },
          topups: {
            create: {
              amount: creditsToAdd,
            },
          },
        },
      });

      console.log("User updated - new credits:", updatedUser.credits);

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          address: updatedUser.address,
          credits: updatedUser.credits,
        },
        creditsAdded: creditsToAdd,
      });
    }

    return NextResponse.json(
      { error: "Invalid type. Use 'topup', 'use', or 'payment_success'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Credits API error:", error);

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Normalize address to lowercase
    const normalizedAddress = address.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { address: normalizedAddress },
      include: {
        topups: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        address: user.address,
        credits: user.credits,
        createdAt: user.createdAt,
        topups: user.topups,
        payments: user.payments,
      },
    });
  } catch (error) {
    console.error("Get credits error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
