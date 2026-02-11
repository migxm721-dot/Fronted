# Overview

This project is a cross-platform mobile chat application built with React Native and Expo, providing a classic chat experience with modern features. It supports real-time messaging, chat rooms, private conversations, user profiles, friends lists, online status, and an in-app credit transfer system. Key capabilities include room browsing, favorite management, user leveling, and theme customization. An integrated admin panel allows for content moderation and user/room management, fostering community and interaction across iOS, Android, and Web platforms.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend

The frontend uses Expo SDK 54, React Native 0.81.4, React 19.1.0, and Expo Router 6.x. It features a custom component library with theming (light, dark, system-auto), SVG icons, animations, a multi-tab chat system, dynamic room management, role-based user profiles with a level system, an in-app credit system with PIN authentication, and secure authentication flows. State management is handled by React hooks and Context API. An admin panel, built with React + Vite, provides management for users, rooms, abuse reports, gifts, and daily login streaks, including real-time statistics and JWT-based authentication.

## Backend (Microservice Architecture)

The system uses a microservice architecture with two independent Node.js services:

### Main Backend (port 5000)
Built with Node.js and Express.js for RESTful APIs and Socket.IO `/chat` namespace for real-time communication. Handles users, rooms, messages, bans, credits, merchants, notifications, vouchers, and admin panel. Game commands from chat are forwarded to the Game Service via Redis Pub/Sub (`game:command` channel).

### Game Service (port 3001)
Independent microservice handling all game logic: DiceBot, LowCard, and FlagBot. Runs its own Socket.IO `/game` namespace. Communicates with the main backend via Redis Pub/Sub channels:
- `game:command` (subscribes): Receives game commands forwarded from the main backend
- `game:chat:message` (publishes): Sends game bot messages back to chat rooms
- `game:credits:update` (publishes): Notifies credit balance changes from game actions

Both services share the same Redis and PostgreSQL instances.

### Database Schema

The PostgreSQL database includes tables for `users`, `rooms`, `messages`, `private_messages`, `credit_logs`, `merchants`, `merchant_spend_logs`, `user_levels`, `room_bans`, `game_history`, `user_blocks`, `room_moderators`, `gifts`, `audit_logs`, `announcements`, and `app_config`.

### Room Presence

Room user counts primarily use the Socket.IO adapter as the source of truth, ensuring real-time accuracy and automatic decrement on disconnection. Redis is used as a fallback for presence.

### Redis Usage

Redis manages online user presence, banned user lists, flood control, global rate limiting, and caching. It supports a real-time chatlist architecture and an in-memory feed system.

### Message Persistence

**Room chat messages** and game bot messages are stored in Redis with a 24-hour TTL, limited to 200 messages per room, and include bot messages for game state persistence.
**Private messages (DMs)** are saved to PostgreSQL, supporting conversation history and real-time updates via Socket.IO events.

### Real-time Communication (Socket.IO)

The backend utilizes two separate Socket.IO namespaces:
- **`/chat` namespace**: Handles chat-related events, room interactions, messages, credit transfers, and system announcements.
- **`/game` namespace**: Dedicated to game events, commands, and state management, providing isolation and preventing conflicts.

### Notification System

Real-time notifications leverage Redis for persistence (24-hour TTL) and Socket.IO for instant delivery, triggering frontend updates and sounds.

### Game and Economy Systems

The application features an XP & Level System, Merchant Commission System, Auto Voucher system for credit codes, and a Daily Login Streak System with credit rewards. Game state management ensures only one game type is active per room, with in-memory timers for DiceBot and Redis-based timers for LowCard for persistence. Command routing prevents conflicts between different game types.

### Merchant Tagging System

Merchants can tag users with game-only credits, generating a 2% commission on spending, split between the merchant and the tagged user, paid out automatically after 24 hours.

### Android Socket Optimization

Optimizations for Android 14-15 devices include faster reconnection, extended background session support (up to 3 hours) via longer JWT and refresh token lifespans, and automatic room rejoin on app resume. A message queue for offline states and optimistic message display improve user experience during disconnections. Socket listener re-registration and singleton enforcement prevent duplicate connections.

### Security Features

The system implements eleven layers of security, including strict server-side validation, Redis rate limiting, robust error handling, distributed locks, idempotency tracking, PIN attempt limiting, enhanced error message sanitization, JWT token expiry management, server-side amount authority, immutable audit logs, and device binding. A centralized logger with data masking ensures auditability without exposing sensitive information.

### Production Configuration

Production environment variables include `NODE_ENV`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `DATABASE_URL`, and `REDIS_URL`. Security measures include JWT secret validation, CORS restrictions, rate limiting, SSL certificate validation, disabled schema auto-init, error sanitization, and production-specific logging.

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