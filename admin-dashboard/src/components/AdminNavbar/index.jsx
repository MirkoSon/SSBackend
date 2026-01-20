import { useState } from "react";

// @mui components
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";

// MD components
import MDBox from "components/MDBox";

// Context
import { useProjects } from "context/projectContext";
import { useMaterialUIController } from "context";

function AdminNavbar() {
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
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        boxShadow: 'none',
        zIndex: ({ zIndex }) => zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        {/* Logo */}
        <MDBox display="flex" alignItems="center" mr={3}>
          <img src="/assets/SSBackend_title_logo.png" alt="SSBackend Logo" style={{ height: "68px" }} />
        </MDBox>

        {/* Project Selector */}
        <MDBox display="flex" alignItems="center" gap={1} mr="auto">
          <Select
            value={safeCurrentProjectId}
            onChange={handleProjectChange}
            size="small"
            sx={{
              minWidth: 200,
              color: '#ffffff',
              backgroundColor: '#0f172a',
              borderRadius: '0.5rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: '#334155',
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: '#f97316',
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: '#f97316',
                boxShadow: '0 0 0 2px rgba(249, 115, 22, 0.3)',
              },
              "& .MuiSvgIcon-root": {
                color: '#f97316',
              },
            }}
          >
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </Select>
          {/* Note: Project creation will be handled via Projects page route */}
        </MDBox>

        {/* Right side icons */}
        <MDBox display="flex" alignItems="center" gap={1}>
          {/* Search Icon */}
          <Tooltip title="Search">
            <IconButton
              size="small"
              sx={{
                color: '#94a3b8',
                '&:hover': {
                  backgroundColor: '#334155',
                  color: '#ffffff'
                }
              }}
            >
              <Icon>search</Icon>
            </IconButton>
          </Tooltip>

          {/* Notifications Icon with badge */}
          <Tooltip title="Notifications">
            <IconButton
              size="small"
              sx={{
                color: '#94a3b8',
                '&:hover': {
                  backgroundColor: '#334155',
                  color: '#ffffff'
                },
                position: 'relative',
              }}
            >
              <Icon>notifications</Icon>
              <MDBox
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                }}
              />
            </IconButton>
          </Tooltip>

          {/* Account Icon */}
          <Tooltip title="Account">
            <IconButton
              size="small"
              onClick={handleAccountMenuOpen}
              sx={{
                color: '#94a3b8',
                '&:hover': {
                  backgroundColor: '#334155',
                  color: '#ffffff'
                }
              }}
            >
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

export default AdminNavbar;
