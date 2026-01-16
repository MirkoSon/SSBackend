import { useState } from "react";
import PropTypes from "prop-types";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Collapse from "@mui/material/Collapse";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useMaterialUIController } from "context";

const SIDEBAR_WIDTH = 280;
const SIDEBAR_MINI_WIDTH = 80;

// Core navigation items
const coreItems = [
  { id: "overview", label: "Dashboard", icon: "dashboard" },
  { id: "users", label: "Users", icon: "people" },
  { id: "saves", label: "Saves", icon: "save" },
  { id: "progress", label: "Progress", icon: "trending_up" },
  { id: "export", label: "Export", icon: "download" },
];

// Plugin categories will be populated dynamically
const pluginCategories = [
  {
    id: "core",
    label: "PLUGINS - CORE",
    items: [
      { id: "economy", label: "Economy", icon: "attach_money" },
      { id: "achievements", label: "Achievements", icon: "emoji_events" },
      { id: "leaderboards", label: "Leaderboards", icon: "leaderboard" },
    ],
  },
  {
    id: "examples",
    label: "PLUGINS - EXAMPLES",
    items: [
      { id: "full-featured", label: "Notes", icon: "note" },
      { id: "hello-world", label: "Hello World", icon: "waving_hand" },
    ],
  },
  {
    id: "community",
    label: "PLUGINS - COMMUNITY",
    items: [],
  },
];

function Sidebar({ currentView, onViewChange }) {
  const [controller] = useMaterialUIController();
  const { darkMode, miniSidenav } = controller;
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

  const renderNavItem = (item) => (
    <ListItem key={item.id} disablePadding>
      <ListItemButton
        selected={currentView === item.id}
        onClick={() => onViewChange(item.id)}
        sx={{
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          "&.Mui-selected": {
            backgroundColor: ({ palette }) =>
              darkMode ? palette.grey[800] : palette.primary.main,
            color: ({ palette }) => palette.white.main,
            "&:hover": {
              backgroundColor: ({ palette }) =>
                darkMode ? palette.grey[700] : palette.primary.dark,
            },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40, color: currentView === item.id ? "white" : "inherit" }}>
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
            sx={{ px: 2, py: 0.5 }}
          >
            {!miniSidenav && (
              <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ flex: 1 }}>
                {category.label}
              </MDTypography>
            )}
            <Icon fontSize="small">
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
          backgroundColor: ({ palette }) =>
            darkMode ? palette.background.default : palette.grey[100],
          borderRight: ({ palette }) =>
            `1px solid ${darkMode ? palette.grey[800] : palette.grey[300]}`,
          transition: "width 0.3s ease-in-out",
          overflowX: "hidden",
          mt: "64px", // Account for navbar height
          height: "calc(100vh - 64px)",
        },
      }}
    >
      <List sx={{ pt: 2 }}>
        {/* Core Items */}
        {coreItems.map((item) => renderNavItem(item))}

        {/* Divider before plugins */}
        <Divider sx={{ my: 2, mx: 2 }} />

        {/* Plugin Categories */}
        {pluginCategories.map((category) => renderPluginSection(category))}
      </List>
    </Drawer>
  );
}

Sidebar.propTypes = {
  currentView: PropTypes.string.isRequired,
  onViewChange: PropTypes.func.isRequired,
};

export default Sidebar;
