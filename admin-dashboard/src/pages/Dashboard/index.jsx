import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useProjects } from "context/projectContext";

function StatCard({ title, value, icon, color = "primary", change, status = "Stable" }) {
  const getChangeColor = () => {
    if (!change) return "text";
    return change > 0 ? "success" : "error";
  };

  return (
    <Card
      sx={{
        backgroundColor: "#1e293b",
        border: "1px solid #334155",
        boxShadow: "none",
        overflow: "visible",
        position: "relative",
      }}
    >
      <MDBox p={3}>
        <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <MDBox
            display="flex"
            justifyContent="center"
            alignItems="center"
            width="3rem"
            height="3rem"
            borderRadius="lg"
            sx={{
              backgroundColor:
                color === "info"
                  ? "#3b82f6"
                  : color === "success"
                  ? "#10b981"
                  : color === "warning"
                  ? "#f59e0b"
                  : "#6366f1",
            }}
          >
            <Icon sx={{ color: "white" }}>{icon}</Icon>
          </MDBox>
          {change !== undefined ? (
            <MDBox display="flex" alignItems="center">
              <MDTypography variant="caption" fontWeight="medium" color={getChangeColor()}>
                {change > 0 ? `+${change}%` : `${change}%`}
              </MDTypography>
              <Icon
                fontSize="small"
                sx={{ color: change > 0 ? "#10b981" : "#ef4444", ml: 0.5 }}
              >
                {change > 0 ? "trending_up" : "trending_down"}
              </Icon>
            </MDBox>
          ) : (
            <Chip
              label={status}
              size="small"
              sx={{
                backgroundColor: "#334155",
                color: "#94a3b8",
                fontSize: "0.75rem",
                height: "24px",
              }}
            />
          )}
        </MDBox>
        <MDTypography variant="caption" color="text" sx={{ color: "#94a3b8", display: "block" }}>
          {title}
        </MDTypography>
        <MDTypography variant="h4" fontWeight="bold" sx={{ color: "white", mt: 0.5 }}>
          {value.toLocaleString()}
        </MDTypography>
      </MDBox>
    </Card>
  );
}

function ActivityItem({ icon, title, description, status, time, iconColor }) {
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
      p={2}
      sx={{
        borderBottom: "1px solid #334155",
        "&:last-child": {
          borderBottom: "none",
        },
      }}
    >
      <MDBox
        display="flex"
        justifyContent="center"
        alignItems="center"
        width="2.5rem"
        height="2.5rem"
        borderRadius="lg"
        mr={2}
        sx={{
          backgroundColor: iconColor || "#334155",
          flexShrink: 0,
        }}
      >
        <Icon sx={{ color: "white", fontSize: "1.25rem" }}>{icon}</Icon>
      </MDBox>
      <MDBox flex={1}>
        <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
          <MDTypography variant="button" fontWeight="medium" sx={{ color: "white" }}>
            {title}
          </MDTypography>
          <MDTypography variant="caption" sx={{ color: "#64748b", ml: 2 }}>
            {time}
          </MDTypography>
        </MDBox>
        <MDTypography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 1 }}>
          {description}
        </MDTypography>
        <Chip
          label={status}
          size="small"
          sx={{
            backgroundColor: statusColors[status] || "#334155",
            color: "white",
            fontSize: "0.625rem",
            height: "20px",
            fontWeight: "bold",
          }}
        />
      </MDBox>
    </MDBox>
  );
}

export default function Dashboard() {
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
    <MDBox pt={4} pb={6} px={3} sx={{ backgroundColor: "#0f172a", minHeight: "100vh" }}>
      {/* Header */}
      <MDBox mb={3}>
        <MDTypography variant="h4" fontWeight="medium" sx={{ color: "white" }}>
          Dashboard Overview
        </MDTypography>
        <MDBox display="flex" alignItems="center" mt={0.5}>
          <Icon sx={{ color: "#64748b", fontSize: "1rem", mr: 0.5 }}>visibility</Icon>
          <MDTypography variant="button" sx={{ color: "#64748b" }}>
            VIEWING DATA FOR PROJECT:{" "}
            <span style={{ color: "#f97316", fontWeight: "bold" }}>
              {currentProjectId || "DEFAULT"}
            </span>
          </MDTypography>
        </MDBox>
      </MDBox>

      {/* Stats Grid */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="TOTAL USERS"
            value={stats.users}
            icon="people"
            color="info"
            change={12}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="GAME SAVES"
            value={stats.saves}
            icon="cloud_upload"
            color="success"
            change={5.2}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="ACTIVE PLUGINS"
            value={stats.activePlugins}
            icon="extension"
            color="warning"
            status="Stable"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <MDBox mb={3}>
        <MDTypography variant="h6" fontWeight="medium" mb={2} sx={{ color: "#94a3b8" }}>
          QUICK ACTIONS
        </MDTypography>
        <MDBox display="flex" gap={2}>
          <IconButton
            sx={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              width: "48px",
              height: "48px",
              "&:hover": {
                backgroundColor: "#334155",
              },
            }}
          >
            <Icon sx={{ color: "white" }}>person_add</Icon>
          </IconButton>
          <IconButton
            sx={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              width: "48px",
              height: "48px",
              "&:hover": {
                backgroundColor: "#334155",
              },
            }}
          >
            <Icon sx={{ color: "white" }}>download</Icon>
          </IconButton>
          <IconButton
            sx={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              width: "48px",
              height: "48px",
              "&:hover": {
                backgroundColor: "#334155",
              },
            }}
          >
            <Icon sx={{ color: "white" }}>settings</Icon>
          </IconButton>
          <IconButton
            sx={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              width: "48px",
              height: "48px",
              "&:hover": {
                backgroundColor: "#334155",
              },
            }}
          >
            <Icon sx={{ color: "white" }}>help</Icon>
          </IconButton>
        </MDBox>
      </MDBox>

      {/* Recent Activity */}
      <Card
        sx={{
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          boxShadow: "none",
        }}
      >
        <MDBox p={3}>
          <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <MDTypography variant="h6" fontWeight="medium" sx={{ color: "white" }}>
              Recent Activity
            </MDTypography>
            <MDTypography
              variant="button"
              sx={{
                color: "#f97316",
                fontWeight: "medium",
                cursor: "pointer",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              VIEW ALL LOGS
            </MDTypography>
          </MDBox>
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
