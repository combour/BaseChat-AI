import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId, transactionHash, amount, to, network } =
      await request.json();

    if (!userId || !transactionHash || !amount || !to || !network) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { transactionHash },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: "Payment already exists" },
        { status: 400 }
      );
    }

    // Create new payment record
    const payment = await prisma.payment.create({
      data: {
        transactionHash,
        amount,
        to,
        network,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            address: true,
            credits: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        transactionHash: payment.transactionHash,
        amount: payment.amount,
        to: payment.to,
        network: payment.network,
        createdAt: payment.createdAt,
        user: payment.user,
      },
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const address = searchParams.get("address");

    let resolvedUserId = userId;
    if (!resolvedUserId && address) {
      const user = await prisma.user.findUnique({
        where: { address: address.toLowerCase() },
      });
      if (user) resolvedUserId = user.id.toString();
    }

    if (!resolvedUserId) {
      return NextResponse.json(
        { error: "User ID or address is required" },
        { status: 400 }
      );
    }

    const payments = await prisma.payment.findMany({
      where: { userId: parseInt(resolvedUserId) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        transactionHash: true,
        amount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
