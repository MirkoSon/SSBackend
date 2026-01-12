/**
 * SSBackend Component Library
 * 
 * Central export file for all UI components.
 * Import components using: import { ComponentName } from './src/ui/components';
 * 
 * @module components
 */

// Layout Components
import CardContainer from './layout/CardContainer';
import TopNav from './layout/TopNav';

// Data Display Components
import StatCard from './data-display/StatCard';
import DataTable from './data-display/DataTable';

// Input Components
import SearchBar from './inputs/SearchBar';

// Navigation Components
import PluginTabs from './navigation/PluginTabs';
import PluginDropdown from './navigation/PluginDropdown';

// Export all components
export {
  // Layout
  CardContainer,
  TopNav,
  
  // Data Display
  StatCard,
  DataTable,
  
  // Inputs
  SearchBar,
  
  // Navigation
  PluginTabs,
  PluginDropdown
};