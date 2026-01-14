import { PluginView } from './PluginView.js';
import { achievementsApi } from './components/AchievementManager/api/achievementsApi.js';

console.log('🏆 Loading Achievements Plugin UI Module...');

// Make components globally available for the integration script
window.AchievementModules = {
    PluginView,
    achievementsApi
};

console.log('✅ Achievements Plugin UI Module loaded successfully');

export { PluginView };
