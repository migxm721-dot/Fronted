import { devLog } from '@/utils/devLog';

const API_BASE_URL = 'https://ac07541c-456a-430b-9561-8763df749320-00-2tcpd5zb2lgeg.pike.replit.dev';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    COUNTRIES: `${API_BASE_URL}/api/auth/countries`,
    GENDERS: `${API_BASE_URL}/api/auth/genders`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password`,
    SEND_EMAIL_OTP: `${API_BASE_URL}/api/auth/send-email-otp`,
    CHANGE_EMAIL: `${API_BASE_URL}/api/auth/change-email`,
    VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
    RESEND_OTP: `${API_BASE_URL}/api/auth/resend-otp`,
  },
  USER: {
    PROFILE: `${API_BASE_URL}/api/user/profile`,
    UPDATE: `${API_BASE_URL}/api/user/update`,
    BY_ID: (id: string) => `${API_BASE_URL}/api/users/${id}`,
    BY_USERNAME: (username: string) => `${API_BASE_URL}/api/users/username/${username}`,
    SEARCH: (query: string, limit: number = 20) => `${API_BASE_URL}/api/users/search?q=${query}&limit=${limit}`,
    ONLINE: (limit: number = 50) => `${API_BASE_URL}/api/users/online?limit=${limit}`,
    UPDATE_ROLE: (id: string) => `${API_BASE_URL}/api/users/${id}/role`,
    UPDATE_STATUS_MESSAGE: (id: string) => `${API_BASE_URL}/api/users/${id}/status-message`,
  },
  PROFILE: {
    AVATAR_UPLOAD: `${API_BASE_URL}/api/profile/avatar/upload`,
    BACKGROUND_UPLOAD: `${API_BASE_URL}/api/profile/background/upload`,
    AVATAR_DELETE: (userId: string) => `${API_BASE_URL}/api/profile/avatar/${userId}`,
    POSTS: `${API_BASE_URL}/api/profile/posts`,
    GET_POSTS: (userId: string) => `${API_BASE_URL}/api/profile/posts/${userId}`,
    DELETE_POST: (postId: string) => `${API_BASE_URL}/api/profile/posts/${postId}`,
    SEND_GIFT: `${API_BASE_URL}/api/profile/gifts/send`,
    RECEIVED_GIFTS: (userId: string) => `${API_BASE_URL}/api/profile/gifts/received/${userId}`,
    SENT_GIFTS: (userId: string) => `${API_BASE_URL}/api/profile/gifts/sent/${userId}`,
    FOLLOW: `${API_BASE_URL}/api/profile/follow`,
    UNFOLLOW: `${API_BASE_URL}/api/profile/follow`,
    FOLLOWERS: (userId: string) => `${API_BASE_URL}/api/profile/followers/${userId}`,
    FOLLOWING: (userId: string) => `${API_BASE_URL}/api/profile/following/${userId}`,
    FOLLOW_STATUS: `${API_BASE_URL}/api/profile/follow/status`,
    STATS: (userId: string) => `${API_BASE_URL}/api/profile/stats/${userId}`,
  },
  VIEW_PROFILE: {
    GET: (userId: string, viewerId?: string) =>
      `${API_BASE_URL}/api/viewprofile/${userId}${viewerId ? `?viewerId=${viewerId}` : ''}`,
  },
  ANNOUNCEMENT: {
    LIST: `${API_BASE_URL}/api/announcements`,
    GET: (id: string) => `${API_BASE_URL}/api/announcements/${id}`,
    CREATE: `${API_BASE_URL}/api/announcements/create`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/announcements/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/api/announcements/${id}`,
  },
  PEOPLE: {
    ALL: `${API_BASE_URL}/api/people/all`,
    BY_ROLE: (role: string) => `${API_BASE_URL}/api/people/role/${role}`,
  },
  LEADERBOARD: {
    ALL: `${API_BASE_URL}/api/leaderboard/all`,
    TOP_LEVEL: `${API_BASE_URL}/api/leaderboard/top-level`,
    TOP_GIFT_SENDER: `${API_BASE_URL}/api/leaderboard/top-gift-sender`,
    TOP_GIFT_RECEIVER: `${API_BASE_URL}/api/leaderboard/top-gift-receiver`,
    TOP_FOOTPRINT: `${API_BASE_URL}/api/leaderboard/top-footprint`,
    TOP_GAMER: `${API_BASE_URL}/api/leaderboard/top-gamer`,
    TOP_GET: `${API_BASE_URL}/api/leaderboard/top-get`,
  },
  FEED: {
    LIST: `${API_BASE_URL}/api/feed`,
    CREATE: `${API_BASE_URL}/api/feed/create`,
    DELETE: (postId: string | number) => `${API_BASE_URL}/api/feed/${postId}`,
    LIKE: (postId: string | number) => `${API_BASE_URL}/api/feed/${postId}/like`,
    COMMENTS: (postId: string | number) => `${API_BASE_URL}/api/feed/${postId}/comments`,
    COMMENT: (postId: string | number) => `${API_BASE_URL}/api/feed/${postId}/comment`,
    TRENDING: `${API_BASE_URL}/api/feed/trending`,
    CELEBRITIES: `${API_BASE_URL}/api/feed/celebrities`,
  },
  ROOM: {
    LIST: `${API_BASE_URL}/api/rooms`,
    CREATE: `${API_BASE_URL}/api/rooms/create`,
    JOIN: (roomId: string) => `${API_BASE_URL}/api/rooms/${roomId}/join`,
    RECENT: (username: string) => `${API_BASE_URL}/api/rooms/recent/${username}`,
    FAVORITES: (username: string) => `${API_BASE_URL}/api/rooms/favorites/${username}`,
    ADD_FAVORITE: `${API_BASE_URL}/api/rooms/favorites/add`,
    REMOVE_FAVORITE: `${API_BASE_URL}/api/rooms/favorites/remove`,
    OFFICIAL: `${API_BASE_URL}/api/rooms/official`,
    GAME: `${API_BASE_URL}/api/rooms/game`,
    SEARCH: (query: string) => `${API_BASE_URL}/api/rooms/search?q=${encodeURIComponent(query)}`,
  },
  CREDIT: {
    BALANCE: `${API_BASE_URL}/api/credit/balance`,
    TRANSFER: `${API_BASE_URL}/api/credit/transfer`,
    HISTORY: `${API_BASE_URL}/api/credit/history`,
    CHANGE_PIN: `${API_BASE_URL}/api/credit/change-pin`,
  },
  MESSAGE: {
    SEND: `${API_BASE_URL}/api/message/send`,
    HISTORY: `${API_BASE_URL}/api/message/history`,
  },
  NOTIFICATION: {
    LIST: `${API_BASE_URL}/api/notifications`,
  },
  STATS: {
    GLOBAL: `${API_BASE_URL}/api/stats/global`,
  },
};

let currentRoomId: string | null = null;
let lastMessageId: string | null = null;
let backgroundTimestamp: number | null = null;

export const setCurrentRoom = (roomId: string | null) => {
  currentRoomId = roomId;
};

export const getCurrentRoom = () => currentRoomId;

export const setLastMessageId = (id: string) => {
  lastMessageId = id;
};

export const getLastMessageId = () => lastMessageId;

// Track when app goes to background for message sync
export const setBackgroundTimestamp = (ts: number | null) => {
  backgroundTimestamp = ts;
};

export const getBackgroundTimestamp = () => backgroundTimestamp;

export default API_BASE_URL;
