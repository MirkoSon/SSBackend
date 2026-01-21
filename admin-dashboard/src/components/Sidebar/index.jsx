import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Collapse from "@mui/material/Collapse";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useMaterialUIController } from "context";
import { useProjects } from "context/projectContext";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";

// Assets
import brandLogo from "assets/SSBackend_title_logo.png";

const SIDEBAR_WIDTH = 280;
const SIDEBAR_MINI_WIDTH = 80;

// Core navigation items with paths - matching mockup
const coreItems = [
  { id: "overview", label: "Dashboard", icon: "dashboard", path: "/" },
  { id: "users", label: "Users", icon: "people", path: "/users" },
  { id: "saves", label: "Saves", icon: "cloud_upload", path: "/saves" },
  { id: "progress", label: "Progress", icon: "trending_up", path: "/progress" },
  { id: "export", label: "Export", icon: "upload", path: "/export" },
];

// Plugin categories will be populated dynamically
const pluginCategories = [
  {
    id: "core",
    label: "PLUGINS - CORE",
    items: [
      { id: "economy", label: "Economy", icon: "attach_money", path: "/plugins/economy" },
      { id: "achievements", label: "Achievements", icon: "emoji_events", path: "/plugins/achievements" },
      { id: "leaderboards", label: "Leaderboards", icon: "leaderboard", path: "/plugins/leaderboards" },
    ],
  },
  {
    id: "examples",
    label: "PLUGINS - EXAMPLES",
    items: [
      { id: "full-featured", label: "Notes", icon: "note", path: "/plugins/full-featured" },
      { id: "hello-world", label: "Hello World", icon: "waving_hand", path: "/plugins/hello-world" },
    ],
  },
  {
    id: "community",
    label: "PLUGINS - COMMUNITY",
    items: [],
  },
];

function Sidebar() {
  const [controller] = useMaterialUIController();
  const { darkMode, miniSidenav } = controller;
  const { projects, currentProjectId, selectProject } = useProjects();
  const location = useLocation();
  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null);
  const [openSections, setOpenSections] = useState({
    core: true,
    examples: true,
    community: true,
  });

  const handleAccountMenuOpen = (event) => setAccountMenuAnchor(event.currentTarget);
  const handleAccountMenuClose = () => setAccountMenuAnchor(null);

  const handleSectionToggle = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Check if current path matches item path
  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item) => (
    <ListItem key={item.id} disablePadding sx={{ px: 1 }}>
      <ListItemButton
        component={Link}
        to={item.path}
        selected={isActive(item.path)}
        sx={{
          borderRadius: '12px',
          mb: 0.5,
          pl: 2,
          py: 1,
          color: isActive(item.path) ? '#ffffff' : '#94a3b8',
          "&:hover": {
            backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            color: darkMode ? '#ffffff' : '#1e293b',
          },
          "&.Mui-selected": {
            backgroundColor: '#ff5722',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(255, 87, 34, 0.2)',
            "&:hover": {
              backgroundColor: '#e64a19',
            },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
          <Icon>{item.icon}</Icon>
        </ListItemIcon>
        {!miniSidenav && <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: isActive(item.path) ? 600 : 500 }} />}
      </ListItemButton>
    </ListItem>
  );

  const renderPluginSection = (category) => {
    // Don't render empty sections
    if (category.items.length === 0) return null;

    return (
      <MDBox key={category.id} mt={2}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleSectionToggle(category.id)}
            sx={{
              px: 2,
              py: 0.5,
              "&:hover": {
                backgroundColor: '#2d2d2d',
              }
            }}
          >
            {!miniSidenav && (
              <MDTypography
                variant="caption"
                fontWeight="bold"
                sx={{
                  flex: 1,
                  color: '#808080',
                  fontSize: '0.7rem',
                  letterSpacing: '0.05em',
                }}
              >
                {category.label}
              </MDTypography>
            )}
            <Icon fontSize="small" sx={{ color: '#808080' }}>
              {openSections[category.id] ? "expand_less" : "expand_more"}
            </Icon>
          </ListItemButton>
        </ListItem>
        <Collapse in={openSections[category.id]} timeout="auto" unmountOnExit>
          <List disablePadding>
            {category.items.map((item) => renderNavItem(item))}
          </List>
        </Collapse>
      </MDBox>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: miniSidenav ? SIDEBAR_MINI_WIDTH : SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: miniSidenav ? SIDEBAR_MINI_WIDTH : SIDEBAR_WIDTH,
          boxSizing: "border-box",
          backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRight: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          transition: "width 0.3s ease-in-out, background-color 0.3s",
          overflowX: "hidden",
          height: "100vh",
          color: darkMode ? '#ffffff' : '#1e293b',
        },
      }}
    >
      <List sx={{ pt: 2, px: 0 }}>
        {/* Brand/Logo */}
        {!miniSidenav && (
          <MDBox px={2} mb={3}>
            <MDBox
              component="img"
              src={brandLogo}
              alt="Stupid Simple Backend"
              sx={{
                width: "100%",
                maxWidth: "200px",
                height: "auto",
                display: "block",
              }}
            />
          </MDBox>
        )}

        {/* Project Selector */}
        {!miniSidenav && (
          <MDBox px={2} mb={4}>
            <Select
              value={currentProjectId || (projects.length > 0 ? projects[0].id : "")}
              onChange={(e) => selectProject(e.target.value)}
              fullWidth
              size="small"
              sx={{
                color: darkMode ? '#ffffff' : '#1e293b',
                backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.85rem',
                "& .MuiOutlinedInput-notchedOutline": {
                  border: 'none',
                },
                "&:hover": {
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                },
                "& .MuiSvgIcon-root": {
                  color: '#94a3b8',
                },
              }}
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </MDBox>
        )}

        {/* Section Label */}
        {!miniSidenav && (
          <MDBox px={2} mb={1}>
            <MDTypography
              variant="caption"
              fontWeight="bold"
              sx={{
                color: '#64748b',
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
              }}
            >
              CORE
            </MDTypography>
          </MDBox>
        )}

        {/* Core Items */}
        {coreItems.map((item) => renderNavItem(item))}

        {/* Divider before plugins */}
        <Divider sx={{ my: 2, ml: 2, mr: 0, borderColor: '#1e293b' }} />

        {/* Plugin Categories */}
        {pluginCategories.map((category) => renderPluginSection(category))}

        {/* Bottom Actions */}
        {!miniSidenav && (
          <MDBox
            sx={{
              position: 'fixed',
              bottom: 0,
              width: SIDEBAR_WIDTH,
              p: 2,
              borderTop: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 10,
            }}
          >
            <Tooltip title="Help">
              <IconButton size="small" sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
                <Icon>help_outline</Icon>
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton size="small" sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
                <Icon>settings</Icon>
              </IconButton>
            </Tooltip>
            <Tooltip title="Account">
              <IconButton
                size="small"
                onClick={handleAccountMenuOpen}
                sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}
              >
                <Icon>account_circle</Icon>
              </IconButton>
            </Tooltip>
          </MDBox>
        )}

        {/* Account Menu */}
        <Menu
          anchorEl={accountMenuAnchor}
          open={Boolean(accountMenuAnchor)}
          onClose={handleAccountMenuClose}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          sx={{ mt: -1 }}
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
      </List>
    </Drawer>
  );
}

export default Sidebar;
