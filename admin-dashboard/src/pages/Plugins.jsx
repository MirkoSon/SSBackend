import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";
import Switch from "@mui/material/Switch";
import Divider from "@mui/material/Divider";

// MD components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDBadge from "components/MDBadge";

// Plugin sub-views
import EconomyManagement from "./Plugins/Economy";
import AchievementsManagement from "./Plugins/Achievements";

// Services
import { pluginsApi } from "services/api/adminService";
import { useMaterialUIController } from "context";

function PluginCard({ plugin, onToggle, onReload }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  const isCore = plugin.id.startsWith("@core/");
  const displayName = plugin.name || plugin.id.split("/").pop();

  return (
    <Card sx={{
      height: "100%",
      backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
      borderRadius: "20px",
      transition: "transform 0.2s, box-shadow 0.2s",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
      }
    }}>
      <MDBox p={3} display="flex" flexDirection="column" height="100%">
        <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <MDBox
            display="flex"
            justifyContent="center"
            alignItems="center"
            width="3rem"
            height="3rem"
            borderRadius="12px"
            sx={{
              backgroundColor: isCore ? "rgba(255, 87, 34, 0.1)" : "rgba(59, 130, 246, 0.1)",
              color: isCore ? "#ff5722" : "#3b82f6"
            }}
          >
            <Icon fontSize="medium">{plugin.adminUI?.navigation?.icon || "extension"}</Icon>
          </MDBox>
          <MDBox display="flex" flexDirection="column" alignItems="flex-end">
            <MDBadge
              badgeContent={plugin.enabled ? "ACTIVE" : "DISABLED"}
              color={plugin.enabled ? "success" : "secondary"}
              variant="gradient"
              size="xs"
            />
            <Switch
              checked={!!plugin.enabled}
              onChange={() => onToggle(plugin.id)}
              color="info"
              size="small"
              sx={{ mt: 1 }}
            />
          </MDBox>
        </MDBox>

        <MDTypography variant="h6" fontWeight="bold" sx={{ color: darkMode ? "white" : "#1e293b", mb: 0.5 }}>
          {displayName}
        </MDTypography>
        <MDTypography variant="caption" sx={{ color: "#64748b", mb: 2, flexGrow: 1 }}>
          {plugin.description || "No description provided."}
        </MDTypography>

        <Divider sx={{ my: 2, opacity: 0.1 }} />

        <MDBox display="flex" justifyContent="space-between" alignItems="center">
          <MDBox>
            <MDTypography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
              VERSION
            </MDTypography>
            <MDTypography variant="button" fontWeight="bold" sx={{ color: darkMode ? "#cbd5e1" : "#475569" }}>
              v{plugin.version || "1.0.0"}
            </MDTypography>
          </MDBox>
          <MDBox display="flex" gap={1}>
            <Tooltip title="Reload Plugin">
              <IconButton size="small" onClick={() => onReload(plugin.id)} sx={{ color: "#94a3b8" }}>
                <Icon fontSize="small">refresh</Icon>
              </IconButton>
            </Tooltip>
            {plugin.enabled && (
              <MDButton
                component={Link}
                to={`/plugins/${plugin.name || plugin.id.split("/").pop()}`}
                variant="text"
                color="info"
                size="small"
                sx={{ textTransform: "none" }}
              >
                Manage
              </MDButton>
            )}
          </MDBox>
        </MDBox>
      </MDBox>
    </Card>
  );
}

function PluginsHub() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  useEffect(() => {
    fetchPlugins();
  }, []);

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const data = await pluginsApi.list();
      setPlugins(data || []);
    } catch (error) {
      console.error("Error fetching plugins:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await pluginsApi.toggle(id);
      fetchPlugins();
    } catch (error) {
      console.error("Error toggling plugin:", error);
    }
  };

  const handleReload = async (id) => {
    try {
      await pluginsApi.reload(id);
      alert("Plugin reloaded successfully");
    } catch (error) {
      console.error("Error reloading plugin:", error);
    }
  };

  return (
    <MDBox>
      <MDBox mb={4}>
        <MDTypography variant="h4" fontWeight="bold" sx={{ color: darkMode ? "white" : "#1e293b" }}>
          Plugin Management
        </MDTypography>
        <MDTypography variant="caption" sx={{ color: "#64748b" }}>
          Extend your backend functionality with modular plugins
        </MDTypography>
      </MDBox>

      {loading ? (
        <MDTypography>Loading plugins...</MDTypography>
      ) : (
        <Grid container spacing={3}>
          {plugins.map((plugin) => (
            <Grid item xs={12} sm={6} md={4} key={plugin.id}>
              <PluginCard
                plugin={plugin}
                onToggle={handleToggle}
                onReload={handleReload}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </MDBox>
  );
}

function Plugins() {
  const { pluginId } = useParams();
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  // Breadcrumbs helper
  const renderBreadcrumbs = () => (
    <MDBox display="flex" alignItems="center" gap={1} mb={1}>
      <MDTypography component={Link} to="/plugins" variant="caption" sx={{ color: darkMode ? "#94a3b8" : "#64748b", textDecoration: "none" }}>
        Plugins
      </MDTypography>
      <Icon sx={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "1rem" }}>chevron_right</Icon>
      <MDTypography variant="caption" sx={{ color: "#ff5722", fontWeight: "bold" }}>
        {pluginId ? (pluginId.charAt(0).toUpperCase() + pluginId.slice(1)) : "Management"}
      </MDTypography>
    </MDBox>
  );

  const renderContent = () => {
    if (!pluginId) return <PluginsHub />;

    switch (pluginId.toLowerCase()) {
      case "economy":
        return <EconomyManagement />;
      case "achievements":
        return <AchievementsManagement />;
      default:
        return (
          <MDBox textAlign="center" py={10}>
            <Icon sx={{ fontSize: "64px !important", color: "#94a3b8", mb: 2 }}>extension_off</Icon>
            <MDTypography variant="h5" sx={{ color: darkMode ? "white" : "#1e293b" }}>
              Plugin View for "{pluginId}" Not Found
            </MDTypography>
            <MDTypography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
              The requested plugin doesn't have a specialized React management view yet.
            </MDTypography>
            <MDButton component={Link} to="/plugins" variant="gradient" color="info">
              Back to Plugins
            </MDButton>
          </MDBox>
        );
    }
  };

  return (
    <MDBox pt={2} pb={6}>
      <MDBox mb={3}>
        {renderBreadcrumbs()}
      </MDBox>
      {renderContent()}
    </MDBox>
  );
}

export default Plugins;
