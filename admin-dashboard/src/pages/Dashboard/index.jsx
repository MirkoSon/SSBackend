import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useProjects } from "context/projectContext";

function StatCard({ title, value, icon, color = "primary" }) {
  return (
    <Card>
      <MDBox display="flex" alignItems="center" p={3}>
        <MDBox
          display="flex"
          justifyContent="center"
          alignItems="center"
          width="4rem"
          height="4rem"
          borderRadius="lg"
          bgColor={color}
          color="white"
          mr={2}
        >
          <Icon fontSize="large">{icon}</Icon>
        </MDBox>
        <MDBox>
          <MDTypography variant="button" fontWeight="regular" color="text">
            {title}
          </MDTypography>
          <MDTypography variant="h4" fontWeight="bold">
            {value}
          </MDTypography>
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default function Dashboard() {
  const { currentProjectId } = useProjects();
  const [stats, setStats] = useState({
    users: 0,
    saves: 0,
    activePlugins: 6,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentProjectId) return;

      setLoading(true);
      try {
        // TODO: Replace with actual API calls
        // For now, using placeholder data
        setStats({
          users: 0,
          saves: 0,
          activePlugins: 6,
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
    <MDBox pt={4} pb={6} px={3}>
      {/* Header */}
      <MDBox mb={3}>
        <MDTypography variant="h4" fontWeight="medium">
          Dashboard Overview
        </MDTypography>
        <MDTypography variant="button" color="text">
          {currentProjectId
            ? `Viewing data for project: ${currentProjectId}`
            : "Select a project to view data"}
        </MDTypography>
      </MDBox>

      {/* Stats Grid */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Total Users"
            value={loading ? "..." : stats.users}
            icon="people"
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Game Saves"
            value={loading ? "..." : stats.saves}
            icon="save"
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Active Plugins"
            value={loading ? "..." : stats.activePlugins}
            icon="extension"
            color="primary"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <MDBox mb={3}>
        <MDTypography variant="h5" fontWeight="medium" mb={2}>
          Quick Actions
        </MDTypography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ p: 2, cursor: "pointer", "&:hover": { boxShadow: 6 } }}>
              <MDBox display="flex" alignItems="center">
                <Icon fontSize="large" color="info" sx={{ mr: 2 }}>
                  person_add
                </Icon>
                <MDBox>
                  <MDTypography variant="button" fontWeight="medium">
                    Add User
                  </MDTypography>
                  <MDTypography variant="caption" color="text">
                    Create new user
                  </MDTypography>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ p: 2, cursor: "pointer", "&:hover": { boxShadow: 6 } }}>
              <MDBox display="flex" alignItems="center">
                <Icon fontSize="large" color="success" sx={{ mr: 2 }}>
                  download
                </Icon>
                <MDBox>
                  <MDTypography variant="button" fontWeight="medium">
                    Export Data
                  </MDTypography>
                  <MDTypography variant="caption" color="text">
                    Backup your data
                  </MDTypography>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ p: 2, cursor: "pointer", "&:hover": { boxShadow: 6 } }}>
              <MDBox display="flex" alignItems="center">
                <Icon fontSize="large" color="warning" sx={{ mr: 2 }}>
                  settings
                </Icon>
                <MDBox>
                  <MDTypography variant="button" fontWeight="medium">
                    Settings
                  </MDTypography>
                  <MDTypography variant="caption" color="text">
                    Configure system
                  </MDTypography>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ p: 2, cursor: "pointer", "&:hover": { boxShadow: 6 } }}>
              <MDBox display="flex" alignItems="center">
                <Icon fontSize="large" color="error" sx={{ mr: 2 }}>
                  help
                </Icon>
                <MDBox>
                  <MDTypography variant="button" fontWeight="medium">
                    Help & Docs
                  </MDTypography>
                  <MDTypography variant="caption" color="text">
                    Get assistance
                  </MDTypography>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      {/* Recent Activity Placeholder */}
      <Card>
        <MDBox p={3}>
          <MDTypography variant="h6" fontWeight="medium" mb={2}>
            Recent Activity
          </MDTypography>
          <MDBox textAlign="center" py={4}>
            <Icon fontSize="large" color="disabled" sx={{ mb: 1 }}>
              timeline
            </Icon>
            <MDTypography variant="button" color="text">
              Activity tracking coming soon...
            </MDTypography>
          </MDBox>
        </MDBox>
      </Card>
    </MDBox>
  );
}
