import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, address } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

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

    // Check if user has enough credits (1 credit per message)
    if (user.credits < 1) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          currentCredits: user.credits,
          requiredCredits: 1,
        },
        { status: 402 }
      );
    }

    // Deduct credits from user account
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: {
          decrement: 1,
        },
      },
    });

    // Make request to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant integrated into a Web3 wallet application. You can help users with general questions, crypto-related topics, and provide useful information. Be concise and helpful.",
        },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    return NextResponse.json({
      content: responseContent,
      usage: completion.usage,
      credits: updatedUser.credits,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Handle specific OpenAI errors
    const openaiError = error as { error?: { code?: string } };
    if (openaiError?.error?.code === "insufficient_quota") {
      return NextResponse.json(
        { error: "API quota exceeded. Please check your OpenAI billing." },
        { status: 429 }
      );
    }

    if (openaiError?.error?.code === "invalid_api_key") {
      return NextResponse.json(
        { error: "Invalid OpenAI API key" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get response from AI" },
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
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      credits: user.credits,
    });
  } catch (error) {
    console.error("Get chat credits error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
