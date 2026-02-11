const getUserLevel = async (userId) => {
  try {
    const { query } = require('../db/db');
    const result = await query('SELECT level, xp FROM user_levels WHERE user_id = $1', [userId]);
    if (result.rows.length > 0) return result.rows[0];
    return { level: 1, xp: 0 };
  } catch (err) {
    return { level: 1, xp: 0 };
  }
};
const addXp = async () => {};
const addDailyChatXp = async () => {};
const XP_REWARDS = { PLAY_GAME: 5, WIN_GAME: 10, SEND_MESSAGE: 1, ENTER_ROOM: 2 };
module.exports = { getUserLevel, addXp, addDailyChatXp, XP_REWARDS };
