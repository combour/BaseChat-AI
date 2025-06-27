import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
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

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        address: user.address,
        credits: user.credits,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Wallet connect error:", error);

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
        { error: "Wallet address is required" },
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
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
