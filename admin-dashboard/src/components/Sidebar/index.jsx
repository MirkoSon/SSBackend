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
  const location = useLocation();
  const [openSections, setOpenSections] = useState({
    core: true,
    examples: true,
    community: true,
  });

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
          borderRadius: '8px',
          mb: 0.5,
          pl: 2,
          py: 1,
          color: isActive(item.path) ? '#ffffff' : '#94a3b8',
          "&:hover": {
            backgroundColor: '#1e293b',
            color: '#ffffff',
          },
          "&.Mui-selected": {
            backgroundColor: '#f97316',
            color: '#ffffff',
            "&:hover": {
              backgroundColor: '#ea580c',
            },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
          <Icon>{item.icon}</Icon>
        </ListItemIcon>
        {!miniSidenav && <ListItemText primary={item.label} />}
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
          backgroundColor: '#0f172a',
          borderRight: '1px solid #1e293b',
          transition: "width 0.3s ease-in-out",
          overflowX: "hidden",
          mt: "64px", // Account for navbar height
          height: "calc(100vh - 64px)",
          color: '#ffffff',
        },
      }}
    >
      <List sx={{ pt: 2, px: 0 }}>
        {/* Brand/Logo */}
        {!miniSidenav && (
          <MDBox px={2} mb={3}>
            <MDBox
              display="flex"
              alignItems="center"
              sx={{
                backgroundColor: '#f97316',
                borderRadius: '8px',
                p: 1.5,
              }}
            >
              <Icon sx={{ color: 'white', fontSize: '1.5rem', mr: 1 }}>dashboard</Icon>
              <MDTypography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                StupidSimple
              </MDTypography>
            </MDBox>
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
      </List>
    </Drawer>
  );
}

export default Sidebar;
