import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { progressApi } from "services/api/adminService";
import { useProjects } from "context/projectContext";
import { useMaterialUIController } from "context";

// Progress bar with label
function ProgressBar({ current, max, label, color = "#ff5722", darkMode }) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  return (
    <MDBox width="100%">
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <MDTypography variant="caption" fontWeight="bold" sx={{ color: darkMode ? "#94a3b8" : "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </MDTypography>
        <MDTypography variant="caption" fontWeight="bold" sx={{ color: darkMode ? "white" : "#1e293b" }}>
          {percentage.toFixed(0)}%
        </MDTypography>
      </MDBox>
      <MDBox
        sx={{
          height: "6px",
          width: "100%",
          backgroundColor: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
          borderRadius: "3px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <MDBox
          sx={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: color,
            borderRadius: "3px",
            boxShadow: "0 0 8px " + color + "40",
            transition: "width 0.5s ease-in-out",
          }}
        />
      </MDBox>
      <MDBox display="flex" justifyContent="space-between" mt={0.5}>
        <MDTypography variant="caption" sx={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "0.65rem", fontWeight: "medium" }}>
          {current.toLocaleString()} / {max.toLocaleString()}
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}

// User avatar with icon
function UserAvatar({ username, darkMode }) {
  return (
    <MDBox display="flex" alignItems="center" gap={1.5}>
      <MDBox
        display="flex"
        justifyContent="center"
        alignItems="center"
        width="34px"
        height="34px"
        borderRadius="10px"
        sx={{
          backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          border: "1px solid " + (darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"),
        }}
      >
        <Icon sx={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "1.1rem" }}>person</Icon>
      </MDBox>
      <MDBox>
        <MDTypography variant="button" fontWeight="bold" sx={{ color: darkMode ? "white" : "#1e293b", lineHeight: 1, display: "block" }}>
          {username}
        </MDTypography>
        <MDTypography variant="caption" sx={{ color: "#ff5722", fontWeight: "bold", fontSize: "0.65rem" }}>
          @active_user
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}

// Helper to format relative time
function formatRelativeTime(dateString) {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  return `${Math.floor(diffHours / 24)} days ago`;
}

export default function Progress() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const { currentProjectId } = useProjects();
  const [progressData, setProgressData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    fetchProgress();
  }, [currentProjectId]);

  useEffect(() => {
    // Filter by metric type based on selected tab
    if (selectedTab === 0) {
      // All metrics
      setFilteredData(progressData);
    } else {
      const metricFilters = {
        1: "level",
        2: "experience",
        3: "play_time_minutes",
        4: "skill_points",
        5: "achievement",
      };
      const metricName = metricFilters[selectedTab];
      const filtered = progressData.filter((item) =>
        Object.keys(item.metrics || {}).includes(metricName)
      );
      setFilteredData(filtered);
    }
    setPage(0);
  }, [selectedTab, progressData]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const data = await progressApi.list();
      setProgressData(data.progress || []);
      setFilteredData(data.progress || []);
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleNewEntry = () => {
    // TODO: Implement new entry dialog
    console.log("New entry");
  };

  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Get metric for display based on tab
  const getMetricForTab = (progress) => {
    const metricMap = {
      0: null, // All metrics - show most prominent
      1: "level",
      2: "experience",
      3: "play_time_minutes",
      4: "skill_points",
      5: "achievement",
    };

    const metricName = metricMap[selectedTab];
    if (!metricName) {
      // Show the first available metric
      const firstMetric = Object.keys(progress.metrics || {})[0];
      return progress.metrics?.[firstMetric] || { current_value: 0, max_value: 100 };
    }

    return progress.metrics?.[metricName] || { current_value: 0, max_value: 100 };
  };

  const getMetricLabel = (metricName) => {
    const labels = {
      level: "LEVEL",
      experience: "XP POINTS",
      play_time_minutes: "PLAYTIME",
      skill_points: "SKILL POINTS",
    };
    return labels[metricName] || metricName.toUpperCase();
  };

  const getMetricColor = (metricName) => {
    const colors = {
      level: "#ff5722",
      experience: "#2196f3",
      play_time_minutes: "#4caf50",
      skill_points: "#ff9800",
    };
    return colors[metricName] || "#ff5722";
  };

  return (
    <MDBox pt={4} pb={6} px={3} sx={{ backgroundColor: darkMode ? '#0f172a' : '#f8fafc', minHeight: "100vh" }}>
      {/* Header */}
      <MDBox mb={3}>
        <MDBox display="flex" alignItems="center" gap={1} mb={1}>
          <MDTypography variant="caption" sx={{ color: darkMode ? "#94a3b8" : "#64748b" }}>
            Default Project
          </MDTypography>
          <Icon sx={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "1rem" }}>chevron_right</Icon>
          <MDTypography variant="caption" sx={{ color: darkMode ? "#94a3b8" : "#64748b" }}>
            CORE
          </MDTypography>
          <Icon sx={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "1rem" }}>chevron_right</Icon>
          <MDTypography variant="caption" sx={{ color: "#ff5722", fontWeight: "bold" }}>
            CHARACTER PROGRESS
          </MDTypography>
        </MDBox>
        <MDTypography variant="h4" fontWeight="bold" sx={{ color: darkMode ? "white" : "#1e293b" }}>
          Character Progress
        </MDTypography>
        <MDTypography variant="caption" sx={{ color: "#64748b" }}>
          Real-time tracking of player metrics and evolution across the project.
        </MDTypography>
      </MDBox>

      {/* Tabs */}
      <MDBox mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          sx={{
            "& .MuiTab-root": {
              color: darkMode ? "#94a3b8" : "#64748b",
              textTransform: "none",
              minHeight: "40px",
              fontSize: "0.75rem",
              fontWeight: "bold",
              "&.Mui-selected": {
                color: "#ff5722",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#ff5722",
            },
          }}
        >
          <Tab label="ALL METRICS" />
          <Tab label="LEVEL" />
          <Tab label="EXPERIENCE" />
          <Tab label="PLAYTIME" />
          <Tab label="SKILL POINTS" />
          <Tab label="ACHIEVEMENTS" />
        </Tabs>
        <MDBox display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Icon>filter_list</Icon>}
            sx={{
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              color: darkMode ? "#94a3b8" : "#64748b",
              textTransform: "none",
              borderRadius: "12px",
              backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.4)',
              "&:hover": {
                borderColor: "#ff5722",
                backgroundColor: darkMode ? 'rgba(255, 87, 34, 0.1)' : 'rgba(255, 87, 34, 0.05)',
                color: "#ff5722",
              },
            }}
          >
            Filter
          </Button>
          <Button
            variant="contained"
            startIcon={<Icon>add</Icon>}
            onClick={handleNewEntry}
            sx={{
              backgroundColor: "#ff5722",
              color: "white",
              textTransform: "none",
              borderRadius: "12px",
              boxShadow: '0 4px 12px rgba(255, 87, 34, 0.2)',
              "&:hover": {
                backgroundColor: "#e64a19",
                boxShadow: '0 6px 16px rgba(255, 87, 34, 0.3)',
              },
            }}
          >
            New Entry
          </Button>
        </MDBox>
      </MDBox>

      {/* Progress Table */}
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
        <TableContainer>
          <Table>
            <TableHead sx={{ display: "table-header-group", backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }}>
              <TableRow>
                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>
                  USER ID
                </TableCell>
                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>
                  METRIC NAME
                </TableCell>
                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>
                  PROGRESS (CURRENT / MAX)
                </TableCell>
                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>
                  RAW VALUE
                </TableCell>
                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>
                  UPDATED AT
                </TableCell>
                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em', textAlign: 'right' }}>
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: "#94a3b8", borderColor: "#334155", py: 4 }}>
                    Loading progress data...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: "#94a3b8", borderColor: "#334155", py: 4 }}>
                    No progress data found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((progress) => {
                  const firstMetricName = Object.keys(progress.metrics || {})[0];
                  const metric = progress.metrics?.[firstMetricName];
                  const metricLabel = getMetricLabel(firstMetricName);
                  const metricColor = getMetricColor(firstMetricName);

                  return (
                    <TableRow
                      key={`${progress.user_id}-${firstMetricName}`}
                      hover
                      sx={{
                        transition: "background-color 0.2s",
                        "&:hover": {
                          backgroundColor: darkMode ? "rgba(255, 255, 255, 0.02) !important" : "rgba(0, 0, 0, 0.02) !important"
                        }
                      }}
                    >
                      <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                        <UserAvatar username={`USR-${progress.user_id}`} darkMode={darkMode} />
                      </TableCell>
                      <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                        <Chip
                          label={metricLabel}
                          size="small"
                          sx={{
                            backgroundColor: darkMode ? `${metricColor}20` : `${metricColor}15`,
                            color: metricColor,
                            fontSize: "0.625rem",
                            height: "20px",
                            fontWeight: "bold",
                            border: "1px solid " + metricColor + "40"
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', minWidth: "200px" }}>
                        <ProgressBar
                          current={metric?.current_value || 0}
                          max={metric?.max_value || 100}
                          label={metricLabel}
                          color={metricColor}
                          darkMode={darkMode}
                        />
                      </TableCell>
                      <TableCell sx={{ color: darkMode ? "white" : "#1e293b", borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontWeight: "bold" }}>
                        {metric?.current_value || 0}
                      </TableCell>
                      <TableCell sx={{ color: darkMode ? "#94a3b8" : "#64748b", borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "12px" }}>
                        {formatRelativeTime(metric?.updated_at)}
                      </TableCell>
                      <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', textAlign: "right" }}>
                        <IconButton
                          size="small"
                          sx={{
                            color: darkMode ? "#94a3b8" : "#64748b",
                            "&:hover": {
                              color: "#ff5722",
                              backgroundColor: darkMode ? 'rgba(255, 87, 34, 0.1)' : 'rgba(255, 87, 34, 0.05)',
                            },
                          }}
                        >
                          <Icon fontSize="small">edit</Icon>
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredData.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            color: darkMode ? "#94a3b8" : "#64748b",
            borderTop: "1px solid " + (darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"),
            "& .MuiTablePagination-selectIcon": {
              color: darkMode ? "#94a3b8" : "#64748b",
            },
            "& .MuiTablePagination-actions button": {
              color: darkMode ? "#94a3b8" : "#64748b",
              "&.Mui-disabled": {
                color: darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
              },
            },
          }}
        />
      </Card>

      {/* Footer text */}
      <MDBox mt={2}>
        <MDTypography variant="caption" sx={{ color: darkMode ? "#94a3b8" : "#64748b" }}>
          Showing {filteredData.length > 0 ? (page * rowsPerPage) + 1 : 0} to {Math.min((page + 1) * rowsPerPage, filteredData.length)} of {filteredData.length} entries
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}
