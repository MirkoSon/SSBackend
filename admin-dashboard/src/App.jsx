import { useRef, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";

// Material Dashboard 2 React themes
import theme from "assets/theme";
import themeDark from "assets/theme-dark";

// Material Dashboard 2 React contexts
import { useMaterialUIController } from "context";
import MDBox from "components/MDBox";
import AdminNavbar from "components/AdminNavbar";
import Sidebar from "components/Sidebar";
import Dashboard from "pages/Dashboard";
import Projects from "pages/Projects";

export default function App() {
  const [controller] = useMaterialUIController();
  const { darkMode, miniSidenav } = controller;
  const createProjectRef = useRef(null);
  const [currentView, setCurrentView] = useState("overview");

  const handleCreateProject = () => {
    if (createProjectRef.current) {
      createProjectRef.current();
    }
  };

  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
  };

  const renderView = () => {
    switch (currentView) {
      case "overview":
        return <Dashboard />;
      case "users":
        return (
          <MDBox p={3}>
            <h2>Users Management - Coming Soon</h2>
          </MDBox>
        );
      case "saves":
        return (
          <MDBox p={3}>
            <h2>Saves Browser - Coming Soon</h2>
          </MDBox>
        );
      case "progress":
        return (
          <MDBox p={3}>
            <h2>Progress Tracking - Coming Soon</h2>
          </MDBox>
        );
      case "export":
        return (
          <MDBox p={3}>
            <h2>Data Export - Coming Soon</h2>
          </MDBox>
        );
      default:
        return (
          <MDBox p={3}>
            <h2>Plugin View: {currentView} - Coming Soon</h2>
          </MDBox>
        );
    }
  };

  return (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        {/* Navbar */}
        <AdminNavbar onCreateProject={handleCreateProject} />

        {/* Sidebar */}
        <Sidebar currentView={currentView} onViewChange={handleViewChange} />

        {/* Main Content */}
        <MDBox
          component="main"
          bgColor={darkMode ? "background.default" : "grey.100"}
          sx={{
            flexGrow: 1,
            mt: "64px", // Account for navbar height
            ml: miniSidenav ? "80px" : "280px",
            transition: "margin-left 0.3s ease-in-out",
            minHeight: "calc(100vh - 64px)",
          }}
        >
          {renderView()}
        </MDBox>

        {/* Projects Modal (hidden, triggered from navbar) */}
        <Projects createProjectRef={createProjectRef} />
      </Box>
    </ThemeProvider>
  );
}
