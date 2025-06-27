# Pay-to-Chat Web3 Application

A Web3-powered chat application that allows users to connect their wallets, buy credits using USDC, and chat with AI while consuming credits.

## Features

- **Wallet Connect**: Connect any Web3 wallet (MetaMask, WalletConnect, etc.)
- **Credit System**: Buy credits using USDC on Base Sepolia testnet
- **Pay-to-Chat**: Each chat message costs 1 credit
- **x402 Integration**: Secure payment processing using x402 protocol
- **Database Storage**: User data and transaction history stored in PostgreSQL
- **Real-time Updates**: Credit balance updates automatically
- **Enhanced Chat UI**: Modern chat interface with advanced loading states and animations

## Enhanced Chat Features

### 🎨 Modern UI/UX

- **Gradient Backgrounds**: Beautiful gradient backgrounds and button effects
- **Smooth Animations**: Message slide-in animations and typing indicators
- **Status Indicators**: Visual feedback for message sending, sent, and error states
- **Responsive Design**: Optimized for all screen sizes

### ⚡ Advanced Loading States

- **Typing Indicators**: Animated dots showing AI is thinking
- **Message Status**: Real-time status updates (sending, sent, error)
- **Skeleton Loading**: Placeholder content while loading
- **Smooth Transitions**: CSS animations for all state changes

### 🔄 Improved Interactions

- **Auto-scroll**: Automatic scrolling to latest messages
- **Auto-resize**: Dynamic textarea resizing
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line
- **Clear Chat**: Option to clear conversation history

### 🎯 Better Feedback

- **Toast Notifications**: Success and error messages
- **Credit Warnings**: Clear indication when credits are low
- **Connection Status**: Visual feedback for wallet connection
- **Error Handling**: Graceful error handling with user-friendly messages

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Web3**: Wagmi, Viem, RainbowKit
- **Payments**: x402 protocol with facilitator proxy
- **AI**: OpenAI GPT-3.5-turbo
- **Animations**: Custom CSS animations and transitions

## Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file with:

   ```
   DATABASE_URL="your_postgresql_connection_string"
   DIRECT_URL="your_direct_postgresql_connection_string"
   ```

3. **Database Setup**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## User Flow

### 1. Connect Wallet

- User visits the application
- Clicks "Connect Wallet" button
- User account is automatically created in the database with 0 credits

### 2. Buy Credits

- User clicks "Buy Credits" button
- Redirected to `/buy-credits` page
- User signs a USDC payment transaction using x402 protocol
- Payment is verified and settled through the facilitator
- Credits are automatically added to user account (1 USDC = 100 credits)

### 3. Chat with AI

- User returns to main chat page
- Credit balance is displayed in the header
- Each message sent costs 1 credit
- AI responses are generated using OpenAI
- Credit balance updates in real-time

## Chat Interface Options

### Standard Chat (`/`)

- Basic chat interface with essential features
- Clean and simple design
- Good for users who prefer minimal UI

### Enhanced Chat (`/chat-demo`)

- Advanced chat interface with premium features
- Modern animations and loading states
- Better visual feedback and interactions
- Recommended for power users

## API Endpoints

### User Management

- `POST /api/user` - Create or get user
- `GET /api/credits?address=<address>` - Get user credits and history

### Credit Management

- `POST /api/credits` - Add/use credits
- `POST /api/wallet-connect` - Connect wallet and create user

### Payment Processing

- `POST /api/facilitator-proxy` - x402 payment verification and settlement

### Chat

- `POST /api/chat` - Send chat message (consumes 1 credit)
- `GET /api/chat?address=<address>` - Get user credit balance

## Database Schema

```sql
User {
  id: Int (Primary Key)
  address: String (Unique)
  credits: Int (Default: 0)
  createdAt: DateTime
}

TopUpHistory {
  id: Int (Primary Key)
  userId: Int (Foreign Key)
  amount: Int
  createdAt: DateTime
}

Payment {
  id: Int (Primary Key)
  transactionHash: String (Unique)
  amount: String
  to: String
  network: String
  userId: Int (Foreign Key)
  createdAt: DateTime
}
```

## Credit System

- **10 credits per $0.01 USDC** (1 credit per $0.001 USDC)
- **1 chat message = 1 credit**
- Credits are automatically deducted when sending messages
- Users can buy more credits anytime from the buy-credits page

## Payment Flow

1. User signs payment transaction with their wallet
2. Payment is verified through x402 facilitator
3. Payment is settled on-chain
4. Credits are automatically added to user account
5. User is redirected back to chat with updated balance

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Demo Pages

- `/` - Main chat interface (standard)
- `/chat-demo` - Enhanced chat interface with advanced features
- `/buy-credits` - Purchase credits with USDC
- `/wallet-demo` - Demo of wallet connect functionality

## Security Features

- Address normalization (lowercase)
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure payment processing with x402 protocol
- Database transaction safety

## Performance Optimizations

- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components
- **Debounced Input**: Optimized textarea resizing
- **Virtual Scrolling**: Efficient message rendering (planned)
- **Image Optimization**: Next.js image optimization

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and semantic HTML
- **Color Contrast**: WCAG compliant color schemes
- **Focus Management**: Proper focus indicators
- **Responsive Design**: Mobile-first approach

## Future Enhancements

- **Message History**: Persistent chat history
- **File Uploads**: Support for image and document sharing
- **Voice Messages**: Audio message support
- **Group Chats**: Multi-user conversations
- **Custom AI Models**: User-selectable AI models
- **Advanced Analytics**: Usage statistics and insights

## Network Configuration

- **Network**: Base Sepolia testnet
- **USDC Contract**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Payment Recipient**: `0xEAde2298C7d1b5C748103da66D6Dd9Cf204E2AD2`
- **x402 Facilitator**: `https://www.x402.org/facilitator`
