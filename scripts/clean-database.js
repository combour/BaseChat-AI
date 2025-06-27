import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log("🔄 Starting database cleanup...");

    // Delete all data from tables in the correct order (respecting foreign key constraints)
    console.log("🗑️  Deleting all payments...");
    await prisma.payment.deleteMany({});

    console.log("🗑️  Deleting all top-up history...");
    await prisma.topUpHistory.deleteMany({});

    console.log("🗑️  Deleting all users...");
    await prisma.user.deleteMany({});

    // Reset auto-increment sequences to start from 1
    console.log("🔄 Resetting auto-increment sequences...");
    await prisma.$executeRaw`ALTER SEQUENCE "User_id_seq" RESTART WITH 1;`;
    await prisma.$executeRaw`ALTER SEQUENCE "TopUpHistory_id_seq" RESTART WITH 1;`;
    await prisma.$executeRaw`ALTER SEQUENCE "Payment_id_seq" RESTART WITH 1;`;

    console.log("✅ Database cleanup completed successfully!");
    console.log("📊 All data has been removed from:");
    console.log("   - Users table");
    console.log("   - TopUpHistory table");
    console.log("   - Payment table");
    console.log("🔄 Auto-increment sequences reset to start from 1");
    console.log("");
    console.log("🎯 You can now start fresh with data entry!");
    console.log("📝 Next new user will have ID: 1");
  } catch (error) {
    console.error("❌ Error during database cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanDatabase();
