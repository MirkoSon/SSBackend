import { useState } from "react";
import PropTypes from "prop-types";

// @mui components
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import Fab from "@mui/material/Fab";

// MD components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Context
import { useProjects } from "context/projectContext";
import { useMaterialUIController } from "context";

function AdminNavbar({ onCreateProject }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const { projects, currentProjectId, selectProject } = useProjects();
  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null);

  const handleAccountMenuOpen = (event) => setAccountMenuAnchor(event.currentTarget);
  const handleAccountMenuClose = () => setAccountMenuAnchor(null);

  const handleProjectChange = (event) => {
    selectProject(event.target.value);
  };

  // Ensure the selected value exists in the projects list
  const safeCurrentProjectId = projects.some((p) => p.id === currentProjectId)
    ? currentProjectId
    : projects.length > 0
      ? projects[0].id
      : "";

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{
        backdropFilter: "blur(20px)",
        backgroundColor: ({ palette, functions }) =>
          darkMode
            ? functions.rgba(palette.background.default, 0.8)
            : functions.rgba(palette.white.main, 0.8),
        boxShadow: ({ boxShadows }) => boxShadows.md,
      }}
    >
      <Toolbar>
        {/* Logo */}
        <MDBox display="flex" alignItems="center" mr={3}>
          <img src="assets/SSBackend_title_logo.png" alt="SSBackend Logo" style={{ height: "68px" }} />
        </MDBox>

        {/* Project Selector */}
        <MDBox display="flex" alignItems="center" gap={1} mr="auto">
          <Select
            value={safeCurrentProjectId}
            onChange={handleProjectChange}
            size="small"
            sx={{
              minWidth: 150,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: ({ palette }) =>
                  darkMode ? palette.grey[700] : palette.grey[400],
              },
            }}
          >
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </Select>
          <Tooltip title="Create new project">
            <Fab
              color="primary"
              size="small"
              onClick={onCreateProject}
              sx={{ width: 24, height: 24, minHeight: 24 }}
            >
              <Icon sx={{ fontSize: "1rem" }}>add</Icon>
            </Fab>
          </Tooltip>
        </MDBox>

        {/* Right side icons */}
        <MDBox display="flex" alignItems="center" gap={1}>
          {/* Help Icon */}
          <Tooltip title="Help">
            <IconButton size="small" color="inherit">
              <Icon>help_outline</Icon>
            </IconButton>
          </Tooltip>

          {/* Settings Icon */}
          <Tooltip title="Settings">
            <IconButton size="small" color="inherit">
              <Icon>settings</Icon>
            </IconButton>
          </Tooltip>

          {/* Account Icon */}
          <Tooltip title="Account">
            <IconButton size="small" color="inherit" onClick={handleAccountMenuOpen}>
              <Icon>account_circle</Icon>
            </IconButton>
          </Tooltip>

          {/* Account Menu */}
          <Menu
            anchorEl={accountMenuAnchor}
            open={Boolean(accountMenuAnchor)}
            onClose={handleAccountMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <MenuItem onClick={handleAccountMenuClose}>
              <Icon sx={{ mr: 1 }}>person</Icon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleAccountMenuClose}>
              <Icon sx={{ mr: 1 }}>logout</Icon>
              Logout
            </MenuItem>
          </Menu>
        </MDBox>
      </Toolbar>
    </AppBar>
  );
}

AdminNavbar.propTypes = {
  onCreateProject: PropTypes.func,
};

AdminNavbar.defaultProps = {
  onCreateProject: () => { },
};

export default AdminNavbar;
