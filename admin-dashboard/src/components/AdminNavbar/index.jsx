import { useState } from "react";

// @mui components
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";

// MD components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Context
import { useMaterialUIController } from "context";

function AdminNavbar() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null);

  const handleAccountMenuOpen = (event) => setAccountMenuAnchor(event.currentTarget);
  const handleAccountMenuClose = () => setAccountMenuAnchor(null);



  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
        boxShadow: 'none',
        zIndex: ({ zIndex }) => zIndex.drawer + 1,
        transition: "background-color 0.3s",
      }}
    >
      <Toolbar>
        {/* Breadcrumbs Placeholder */}
        <MDBox display="flex" alignItems="center" gap={1} mr="auto">
          <MDTypography variant="button" fontWeight="medium" sx={{ color: darkMode ? '#ffffff88' : '#64748b' }}>
            Database
          </MDTypography>
          <Icon sx={{ fontSize: 'small', color: '#94a3b8' }}>chevron_right</Icon>
          <MDTypography variant="button" fontWeight="bold" sx={{ color: darkMode ? '#ffffff' : '#1e293b' }}>
            Dashboard
          </MDTypography>
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

          {/* Account Icon / Avatar */}
          <Tooltip title="Account">
            <IconButton
              size="small"
              onClick={handleAccountMenuOpen}
              sx={{
                p: 0.5,
                '&:hover': {
                  backgroundColor: 'transparent',
                }
              }}
            >
              <MDBox
                component="img"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5zQS5s-QcL7Ya9Bvdtp3Kb38sPQ8dwmzXTc_cAwuvPxQ6kYi91rOMrrBA1H4rHa9UzbfGbBB7k49j6qRZhO-VlZiWka44ULRpPOsihjRn9JkfLkm6tF5lfC8wAbC3ZCMpPa_bfqwpg8IsxIMifjWuOI_UnuLwJlOS5NwH6uIgCN1tuwrZIGTOckkLkUu46Jb5mWSoDYgAjAAQjRlTrcBNHmZQVQtb7VZUi-jbPq6IreqyYQ1HQwlXqH294YPAVIImZKEyO-20IFM"
                alt="user-avatar"
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '2px solid transparent',
                  transition: 'border-color 0.2s',
                  '&:hover': {
                    borderColor: '#ff5722',
                  }
                }}
              />
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
