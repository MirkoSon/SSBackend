import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useProjects } from "context/projectContext";
import { useMaterialUIController } from "context";

function StatCard({ title, value, icon, color = "primary", change }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  const getIconColors = () => {
    switch (color) {
      case "info": return { bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6" };
      case "success": return { bg: "rgba(16, 185, 129, 0.1)", text: "#10b981" };
      case "warning": return { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b" };
      default: return { bg: "rgba(255, 87, 34, 0.1)", text: "#ff5722" };
    }
  };

  const iconColors = getIconColors();

  return (
    <Card
      sx={{
        backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        boxShadow: 'none',
        borderRadius: '24px',
        overflow: 'hidden',
      }}
    >
      <MDBox p={3} display="flex" alignItems="center" gap={2}>
        <MDBox
          display="flex"
          justifyContent="center"
          alignItems="center"
          width="48px"
          height="48px"
          borderRadius="14px"
          sx={{
            backgroundColor: iconColors.bg,
            color: iconColors.text,
          }}
        >
          <Icon>{icon}</Icon>
        </MDBox>
        <MDBox>
          <MDTypography
            variant="caption"
            fontWeight="bold"
            sx={{
              color: darkMode ? '#94a3b8' : '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '10px'
            }}
          >
            {title}
          </MDTypography>
          <MDBox display="flex" alignItems="baseline" gap={1}>
            <MDTypography variant="h4" fontWeight="bold" sx={{ color: darkMode ? 'white' : '#1e293b' }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </MDTypography>
            {change && (
              <MDTypography variant="caption" fontWeight="bold" color="success" sx={{ fontSize: '11px' }}>
                +{change}%
              </MDTypography>
            )}
          </MDBox>
        </MDBox>
      </MDBox>
    </Card>
  );
}

function ActivityItem({ icon, title, description, status, time, iconColor }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  const statusColors = {
    SUCCESS: "#10b981",
    "IN PROGRESS": "#3b82f6",
    WARNING: "#f59e0b",
    AUDIT: "#6366f1",
  };

  return (
    <MDBox
      display="flex"
      alignItems="flex-start"
      p={2.5}
      sx={{
        borderBottom: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
        "&:last-child": {
          borderBottom: "none",
        },
      }}
    >
      <MDBox
        display="flex"
        justifyContent="center"
        alignItems="center"
        width="40px"
        height="40px"
        borderRadius="12px"
        mr={2.5}
        sx={{
          backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          color: iconColor || (darkMode ? '#94a3b8' : '#64748b'),
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: "1.25rem" }}>{icon}</Icon>
      </MDBox>
      <MDBox flex={1}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
          <MDTypography variant="button" fontWeight="bold" sx={{ color: darkMode ? 'white' : '#1e293b' }}>
            {title}
          </MDTypography>
          <MDTypography variant="caption" sx={{ color: '#94a3b8' }}>
            {time}
          </MDTypography>
        </MDBox>
        <MDTypography variant="caption" sx={{ color: darkMode ? '#94a3b8' : '#64748b', display: "block", mb: 1, fontSize: '0.8rem' }}>
          {description}
        </MDTypography>
        <Chip
          label={status}
          size="small"
          sx={{
            backgroundColor: `${statusColors[status]}22` || "#33415522",
            color: statusColors[status] || "#94a3b8",
            fontSize: "0.625rem",
            height: "20px",
            fontWeight: "bold",
            borderRadius: '6px'
          }}
        />
      </MDBox>
    </MDBox>
  );
}


export default function Dashboard() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const { currentProjectId } = useProjects();
  const [stats, setStats] = useState({
    users: 12842,
    saves: 45102,
    activePlugins: 8,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentProjectId) return;

      setLoading(true);
      try {
        // TODO: Replace with actual API calls
        // For now, using placeholder data from mockup
        setStats({
          users: 12842,
          saves: 45102,
          activePlugins: 8,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentProjectId]);

  return (
    <MDBox pt={4} pb={6} px={3} sx={{ backgroundColor: 'transparent' }}>
      {/* Header */}
      <MDBox mb={5} display="flex" justifyContent="space-between" alignItems="flex-end">
        <MDBox>
          <MDTypography variant="h3" fontWeight="bold" sx={{ color: darkMode ? 'white' : '#1e293b', letterSpacing: '-0.02em' }}>
            Dashboard Overview
          </MDTypography>
          <MDTypography variant="button" sx={{ color: darkMode ? '#94a3b8' : '#64748b', mt: 0.5, display: 'block' }}>
            Manage and monitor your application's health.
          </MDTypography>
        </MDBox>
        <MDBox display="flex" alignItems="center" bgcolor={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} px={2} py={1} borderRadius="12px">
          <Icon sx={{ color: '#ff5722', fontSize: "1.25rem", mr: 1 }}>analytics</Icon>
          <MDTypography variant="button" fontWeight="bold" sx={{ color: darkMode ? 'white' : '#1e293b' }}>
            {currentProjectId || "DEFAULT"}
          </MDTypography>
        </MDBox>
      </MDBox>

      {/* Stats Grid */}
      <Grid container spacing={4} mb={6}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Users"
            value={stats.users}
            icon="group"
            color="info"
            change={12.5}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Active Today"
            value={1402}
            icon="bolt"
            color="success"
            change={8.2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Active Plugins"
            value={stats.activePlugins}
            icon="extension"
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <MDBox mb={6}>
        <MDTypography
          variant="caption"
          fontWeight="bold"
          mb={2}
          display="block"
          sx={{ color: darkMode ? '#94a3b8' : '#64748b', letterSpacing: '0.05em' }}
        >
          QUICK ACTIONS
        </MDTypography>
        <MDBox display="flex" gap={2}>
          {[
            { icon: 'person_add', label: 'Add User' },
            { icon: 'file_download', label: 'Export' },
            { icon: 'settings', label: 'Settings' },
            { icon: 'help', label: 'Help' }
          ].map((action) => (
            <IconButton
              key={action.icon}
              sx={{
                backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
                borderRadius: "14px",
                width: "52px",
                height: "52px",
                transition: 'all 0.2s',
                "&:hover": {
                  backgroundColor: '#ff5722',
                  borderColor: '#ff5722',
                  transform: 'translateY(-2px)',
                  "& .MuiIcon-root": { color: 'white' }
                },
              }}
            >
              <Icon sx={{ color: darkMode ? '#94a3b8' : '#64748b' }}>{action.icon}</Icon>
            </IconButton>
          ))}
        </MDBox>
      </MDBox>

      {/* Recent Activity */}
      <Card
        sx={{
          backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          boxShadow: "none",
          borderRadius: '24px',
          overflow: 'hidden'
        }}
      >
        <MDBox p={4} pb={2}>
          <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <MDTypography variant="h5" fontWeight="bold" sx={{ color: darkMode ? 'white' : '#1e293b' }}>
              Recent Activity
            </MDTypography>
            <MDTypography
              variant="button"
              sx={{
                color: "#ff5722",
                fontWeight: "bold",
                cursor: "pointer",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              VIEW ALL LOGS
            </MDTypography>
          </MDBox>
          <MDTypography variant="button" sx={{ color: darkMode ? '#94a3b8' : '#64748b', display: 'block', mb: 3 }}>
            Latest events from your registered plugins and core services.
          </MDTypography>
          <MDBox>
            <ActivityItem
              icon="person_add"
              title="New User Registered"
              description="User alex_dev_22 successfully created via Web API."
              status="SUCCESS"
              time="2 mins ago"
              iconColor="#3b82f6"
            />
            <ActivityItem
              icon="cloud_upload"
              title="Cloud Save Updated"
              description='Game save data synchronization completed for project "Neon Runner".'
              status="IN PROGRESS"
              time="15 mins ago"
              iconColor="#3b82f6"
            />
            <ActivityItem
              icon="warning"
              title="Economy Plugin Alert"
              description="Unusual transaction volume detected in 'Gold' resource category."
              status="WARNING"
              time="1 hour ago"
              iconColor="#f59e0b"
            />
            <ActivityItem
              icon="settings"
              title="System Configuration Changed"
              description="Global session timeout updated from 3600s to 7200s by Admin."
              status="AUDIT"
              time="3 hours ago"
              iconColor="#6366f1"
            />
          </MDBox>
        </MDBox>
      </Card>
    </MDBox>
  );
}
