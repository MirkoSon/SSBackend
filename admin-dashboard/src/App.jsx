import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Material Dashboard 2 React themes
import theme from 'assets/theme';
import themeDark from 'assets/theme-dark';

// Material Dashboard 2 React contexts
import { useMaterialUIController } from 'context';

// Layouts
import DashboardLayout from 'layouts/DashboardLayout';

// Pages
import Dashboard from 'pages/Dashboard/index';
import Projects from 'pages/Projects';
import Users from 'pages/Users';
import Saves from 'pages/Saves';
import Progress from 'pages/Progress';
import Export from 'pages/Export';
import Plugins from 'pages/Plugins';
import NotFound from 'pages/NotFound';

export default function App() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  return (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="users" element={<Users />} />
          <Route path="saves" element={<Saves />} />
          <Route path="progress" element={<Progress />} />
          <Route path="export" element={<Export />} />
          <Route path="plugins" element={<Plugins />} />
          <Route path="plugins/:pluginId" element={<Plugins />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}
