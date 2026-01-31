# Overview

This project is a cross-platform mobile chat application built with React Native and Expo, offering a classic chat experience with modern features. It provides real-time messaging, chat rooms, private conversations, user profiles, and social networking functionalities such as friends lists and online status. The application supports iOS, Android, and Web, incorporating room browsing, favorite management, user leveling, theme customization, and a credit transfer system. An integrated admin panel facilitates content moderation and user/room management, aiming to foster community and interaction.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend

The frontend uses Expo SDK 54, React Native 0.81.4, React 19.1.0, and Expo Router 6.x. It features a custom component library with theming (light, dark, system-auto), SVG icons, animations with React Native Gesture Handler and Reanimated, a multi-tab chat system, dynamic room management, role-based user profiles with a level system, an in-app credit system with PIN authentication, and secure authentication flows. State management is handled by React hooks and Context API.

A React + Vite admin panel (`/admin-panel`) provides management for users, rooms, abuse reports, gifts, and daily login streaks. It includes real-time statistics and JWT-based authentication, with a dark green theme and responsive design.

## Backend

The backend is built with Node.js and Express.js for RESTful APIs and Socket.IO for real-time communication. PostgreSQL (Neon DB) is used for persistent data storage, and Redis Cloud manages presence, rate limiting, and caching. The backend is structured into services for users, rooms, messages, bans, credits, merchants, and games.

### Database Schema

The PostgreSQL database includes tables for `users`, `rooms`, `messages`, `private_messages`, `credit_logs`, `merchants`, `merchant_spend_logs`, `user_levels`, `room_bans`, `game_history`, `user_blocks`, `room_moderators`, `gifts`, `audit_logs`, and `announcements`.

### Redis Usage

Redis manages online user presence, banned user lists, flood control, global rate limiting, and caching, acting as the source of truth for online/offline status. It also powers a real-time, Redis-only chatlist architecture and an in-memory feed system.

### Message Persistence

Both chat messages AND game bot messages (DiceBot, LowCard, FlagBot) are stored in Redis:
- Key: `room:messages:{roomId}`
- Limit: 100 messages per room (oldest auto-pruned)
- TTL: 24 hours
- On reconnect: `syncBacklog` event sends last 50 messages including bot messages
- This ensures users see game state after disconnect/reconnect

### Real-time Communication (Socket.IO)

The backend uses two separate Socket.IO namespaces to prevent conflicts between chat and game functionality:

**`/chat` namespace** - Handles chat-related events:
- Room interactions (join, leave, presence)
- Chat messages and private messages
- Credit transfers and notifications
- System events and announcements
- Game commands (backward compatibility for existing clients)

**`/game` namespace** - Dedicated game events:
- Game commands (`game:command`, `game:command:received`)
- Game room management (`game:room:join`, `game:room:leave`)
- Bot messages (`game:bot:message`)
- Game state events (play, history, stats, leaderboard)

**Architecture Benefits:**
- Game logic is isolated from chat, preventing command conflicts
- Bot messages are broadcast to both namespaces for compatibility
- Clients can connect to `/game` for dedicated game interactions
- PubSub routes commands between namespaces via Redis channels

**Files:**
- `backend/namespaces/gameNamespace.js` - Game namespace setup and handlers
- `backend/pubsub/sub.js` - Subscribes to `game:command` channel and routes to both namespaces

### Notification System

Real-time notifications use Redis for persistence and Socket.IO for instant delivery. Notifications are stored in Redis with 24-hour TTL (`notif:{username}`) and emitted via socket events (`notif:gift`, `notif:comment`, `notif:follow`, `notif:credit`). The frontend listens for these events to play sounds and update the notification badge immediately without requiring logout/login.

### Game and Economy Systems

The application includes an XP & Level System, a Merchant Commission System, an Auto Voucher system for credit codes, and a Daily Login Streak System with credit rewards.

### Game State Management

Each room can have only ONE game type active at a time. The `gameStateManager` service tracks the active game type per room using Redis key `room:{roomId}:activeGameType`. When a bot is added to a room, it sets the active game type. When removed, it clears it.

**Game Types:**
- `dice` - DiceBot game:
  - `!start [amount]` - Start game with bet amount
  - `!j` - Join game
  - `!r` - Roll dice
  - `!n` - Cancel join (refund coins before game starts)
  - `!stop` - Stop game (admin/CS/room admin only)
  - `!reset` - Reset stuck game (admin/CS only)
  - `/bot dice` - Add DiceBot to room (admin only)
  - `/bot dice off` - Remove DiceBot from room (admin only)
- `lowcard` - LowCard game:
  - `!start [amount]` - Start game with bet amount (default 1 COINS)
  - `!j` - Join game
  - `!d` - Draw card
  - `!reset` - Reset stuck game (admin/CS only)
  - `/bot lowcard` - Add LowCard bot to room (admin only)
  - `/bot lowcard off` - Remove LowCard bot from room (admin only)
- `flagbot` - FlagBot/Legend game (commands: `!fg`, `!b [group] [amount]`)

**DiceBot Timer System:**
- Uses in-memory timers for simplicity
- Join phase: 30 seconds, Roll phase: 20 seconds
- If all players roll, timer skips directly to "Times Up"

**LowCard Timer System:**
- Uses Redis-based timers (`room:{roomId}:lowcard:timer`) for persistence across server restarts
- Timer poller runs every 1s using scanIterator for Redis performance
- Join phase: 30 seconds, Draw phase: 20 seconds
- Concurrency guard prevents overlapping scans under load
- Stale game cleanup: 2-minute timeout with automatic refunds

**Command Routing:**
- Exclusive commands (`!d`, `!r`, `!fg`, `!b`) are routed ONLY to their respective game type
- Shared commands (`!start`, `!j`) are routed based on active game type
- This prevents command conflicts when multiple bots exist in different rooms

### Merchant Tagging System

Merchants can tag users with exactly 5000 COINS game-only credits. Tagged credits are consumed before regular credits when playing games (LowCard, FlagBot, Dice). A 2% commission is generated on tagged credit spending, split equally between merchant (1%) and tagged user (1%). Commissions mature after 24 hours and are automatically paid out via hourly background job. Key tables: `merchant_tags`, `merchant_tag_spends`, `merchant_tag_commissions`. API endpoints: `/api/merchants/tag/:userId`, `/api/merchants/tags/:userId`, `/api/merchants/untag/:tagId`.

### Android 14-15 Socket Optimization

Android 14-15 devices (especially Xiaomi/Redmi) have aggressive battery optimization that disconnects sockets quickly when app goes to background. The following optimizations are implemented:

**Faster Reconnection (Android only):**
- Reconnection delay: 1s (vs 5s iOS)
- Max delay: 5s (vs 15s iOS)
- Disconnect retry: 500ms (vs 5s iOS)
- Heartbeat interval: 8s (vs 15s iOS)
- Background reconnect: 10s interval
- Re-auth threshold: 5s (vs 60s iOS)

**Message Queue for Offline State:**
- Messages queued when socket disconnected
- Auto-flush on reconnect
- Max 50 messages in queue
- User ID validation prevents cross-user leakage
- Queue cleared on logout/user switch

**Optimistic Message Display:**
- Sent messages are added to UI immediately (no wait for server echo)
- Prevents message disappearing after background/reconnect
- Content-based deduplication (5-second window) prevents duplicates from server echo
- AppState resume handler forces listener re-registration after 5+ seconds background

**Socket Listener Re-registration:**
- `handleSocketIdChange()` clears old listener entries when socket.id changes
- `socketId` state change triggers useEffect to re-register listeners
- AppState handler detects app resume and forces listener check

Files: `hooks/useSocketInit.ts`, `hooks/useRoomSocket.ts`, `app/chatroom/[id].tsx`, `stores/useRoomTabsStore.ts`

### Security Features

The system incorporates eleven layers of security: strict server-side validation, Redis rate limiting, robust error handling and logging, Redis distributed locks, idempotency tracking, PIN attempt limiting with cooldowns, enhanced error message sanitization, JWT token expiry management, server-side amount authority, an immutable audit log, and device binding to prevent token theft. A centralized logger with data masking prevents data leakage while maintaining audit capability across various logging levels (INFO, WARN, SECURITY, ERROR).

### Production Configuration

Required environment variables for production deployment:

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Set to `production` for production mode | Yes |
| `JWT_SECRET` | Strong secret key (min 32 characters) for JWT signing | Yes |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | Recommended |
| `DATABASE_URL` | PostgreSQL connection string with SSL | Yes |
| `REDIS_URL` | Redis Cloud connection string | Yes |

Production security features:
- JWT secret validation: Server refuses to start if secret is missing or too short
- CORS restriction: Only whitelisted origins allowed in production
- Rate limiting: Login (10/15min), Register (5/hour), OTP (5/10min)
- SSL certificate validation: Enabled for database connections
- Schema auto-init: Disabled in production (use migrations)
- Error sanitization: Detailed errors hidden from users in production
- Production logging: Backend uses `logger.info()` (only logs in development), frontend uses `devLog()` (only logs when `__DEV__` is true) - no sensitive data exposed in production

# External Dependencies

## Core Expo Modules

`expo-router`, `expo-font`, `expo-splash-screen`, `expo-status-bar`, `expo-constants`, `expo-system-ui`, `expo-linking`, `expo-web-browser`, `expo-image`, `expo-blur`, `expo-haptics`, `expo-linear-gradient`.

## UI & Animation Libraries

`react-native-reanimated`, `react-native-gesture-handler`, `react-native-pager-view`, `react-native-svg`, `react-native-safe-area-context`, `react-native-screens`.

## Storage

`@react-native-async-storage/async-storage`.

## Backend Specific Dependencies

`Node.js`, `Express.js`, `Socket.IO`, `PostgreSQL (Neon DB)`, `Redis Cloud`.

## Image Upload

`Cloudinary` for gift image storage.

## API Configuration

**API Base URL**: `https://d1a7ddfc-5415-44f9-92c0-a278e94f8f08-00-1i8qhqy6zm7hx.sisko.replit.dev` (also used for Socket.IO).