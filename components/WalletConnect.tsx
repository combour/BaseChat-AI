// "use client";

// import { useState } from "react";
// import { ConnectButton } from "@rainbow-me/rainbowkit";
// import { useWalletConnect } from "@/lib/hooks/useWalletConnect";
// import { toast } from "sonner";

// export function WalletConnect() {
//   const {
//     user,
//     isLoading,
//     error,
//     connectWallet,
//     disconnectWallet,
//     addCredits,
//     useCredits,
//   } = useWalletConnect();
//   const [creditAmount, setCreditAmount] = useState("");

//   const handleAddCredits = async () => {
//     const amount = parseInt(creditAmount);
//     if (isNaN(amount) || amount <= 0) {
//       toast.error("Please enter a valid amount");
//       return;
//     }

//     await addCredits(amount);
//     if (!error) {
//       toast.success(`Added ${amount} credits to your account`);
//       setCreditAmount("");
//     } else {
//       toast.error(error);
//     }
//   };

//   const handleUseCredits = async (amount: number) => {
//     await useCredits(amount);
//     if (!error) {
//       toast.success(`Used ${amount} credits`);
//     } else {
//       toast.error(error);
//     }
//   };

//   return (
//     <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
//       <div className="flex justify-center mb-6">
//         <ConnectButton />
//       </div>

//       {error && (
//         <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//           {error}
//         </div>
//       )}

//       {user && (
//         <div className="space-y-4">
//           <div className="p-4 bg-gray-50 rounded-lg">
//             <h3 className="text-lg font-semibold mb-2">User Info</h3>
//             <p className="text-sm text-gray-600">
//               <span className="font-medium">Address:</span> {user.address}
//             </p>
//             <p className="text-sm text-gray-600">
//               <span className="font-medium">Credits:</span> {user.credits}
//             </p>
//             <p className="text-sm text-gray-600">
//               <span className="font-medium">Member since:</span>{" "}
//               {new Date(user.createdAt).toLocaleDateString()}
//             </p>
//           </div>

//           <div className="p-4 bg-blue-50 rounded-lg">
//             <h3 className="text-lg font-semibold mb-2">Add Credits</h3>
//             <div className="flex gap-2">
//               <input
//                 type="number"
//                 value={creditAmount}
//                 onChange={(e) => setCreditAmount(e.target.value)}
//                 placeholder="Amount"
//                 className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 min="1"
//               />
//               <button
//                 onClick={handleAddCredits}
//                 disabled={isLoading || !creditAmount}
//                 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {isLoading ? "Adding..." : "Add"}
//               </button>
//             </div>
//           </div>

//           <div className="p-4 bg-green-50 rounded-lg">
//             <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
//             <div className="grid grid-cols-2 gap-2">
//               <button
//                 onClick={() => handleUseCredits(1)}
//                 disabled={isLoading || user.credits < 1}
//                 className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
//               >
//                 Use 1 Credit
//               </button>
//               <button
//                 onClick={() => handleUseCredits(5)}
//                 disabled={isLoading || user.credits < 5}
//                 className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
//               >
//                 Use 5 Credits
//               </button>
//             </div>
//           </div>

//           <button
//             onClick={disconnectWallet}
//             className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
//           >
//             Disconnect Wallet
//           </button>
//         </div>
//       )}

//       {!user && !isLoading && (
//         <div className="text-center text-gray-600">
//           <p>Connect your wallet to get started</p>
//         </div>
//       )}

//       {isLoading && (
//         <div className="text-center">
//           <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
//           <p className="mt-2 text-gray-600">Loading...</p>
//         </div>
//       )}
//     </div>
//   );
// }
