import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAndNormalizeAddress } from "@/lib/utils/address";

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Validate and normalize address
    const normalizedAddress = validateAndNormalizeAddress(address);

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
      id: user.id,
      address: user.address,
      credits: user.credits,
    });
  } catch (error) {
    console.error("User API error:", error);

    // Handle validation errors
    if (
      error instanceof Error &&
      error.message.includes("Invalid Ethereum address")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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
