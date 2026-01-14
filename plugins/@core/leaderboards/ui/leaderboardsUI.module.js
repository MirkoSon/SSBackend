import { PluginView } from './PluginView.js';
import { leaderboardsApi } from './components/LeaderboardManager/api/leaderboardsApi.js';

console.log('🏆 Loading Leaderboards Plugin UI Module...');

// Make components globally available for the dashboard integration
window.LeaderboardModules = {
    PluginView,
    leaderboardsApi
};

console.log('✅ Leaderboards Plugin UI Module loaded successfully');

export { PluginView };
