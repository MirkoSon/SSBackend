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

// Progress bar with label
function ProgressBar({ current, max, label, color = "#3b82f6" }) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  return (
    <MDBox>
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Chip
          label={label}
          size="small"
          sx={{
            backgroundColor: color,
            color: "white",
            fontSize: "0.625rem",
            height: "20px",
            fontWeight: "bold",
          }}
        />
        <MDTypography variant="caption" sx={{ color: "#94a3b8" }}>
          {percentage.toFixed(0)}%
        </MDTypography>
      </MDBox>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 8,
          borderRadius: 1,
          backgroundColor: "#334155",
          "& .MuiLinearProgress-bar": {
            backgroundColor: color,
            borderRadius: 1,
          },
        }}
      />
      <MDBox display="flex" justifyContent="space-between" mt={0.5}>
        <MDTypography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem" }}>
          {current.toLocaleString()} / {max.toLocaleString()}
        </MDTypography>
        <MDTypography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem" }}>
          {percentage.toFixed(1)}%
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}

// User avatar with icon
function UserAvatar({ username }) {
  return (
    <MDBox display="flex" alignItems="center" gap={1}>
      <MDBox
        display="flex"
        justifyContent="center"
        alignItems="center"
        width="2rem"
        height="2rem"
        borderRadius="8px"
        sx={{ backgroundColor: "#334155" }}
      >
        <Icon sx={{ color: "#94a3b8", fontSize: "1rem" }}>person</Icon>
      </MDBox>
      <MDBox>
        <MDTypography variant="button" fontWeight="medium" sx={{ color: "white" }}>
          {username}
        </MDTypography>
        <MDTypography variant="caption" sx={{ color: "#64748b", display: "block", fontSize: "0.7rem" }}>
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
      level: "#3b82f6",
      experience: "#f59e0b",
      play_time_minutes: "#8b5cf6",
      skill_points: "#10b981",
    };
    return colors[metricName] || "#3b82f6";
  };

  return (
    <MDBox pt={4} pb={6} px={3} sx={{ backgroundColor: "#0f172a", minHeight: "100vh" }}>
      {/* Header */}
      <MDBox mb={3}>
        <MDBox display="flex" alignItems="center" gap={1} mb={1}>
          <MDTypography variant="caption" sx={{ color: "#64748b" }}>
            Default Project
          </MDTypography>
          <Icon sx={{ color: "#64748b", fontSize: "1rem" }}>chevron_right</Icon>
          <MDTypography variant="caption" sx={{ color: "#64748b" }}>
            CORE
          </MDTypography>
          <Icon sx={{ color: "#64748b", fontSize: "1rem" }}>chevron_right</Icon>
          <MDTypography variant="caption" sx={{ color: "#f97316", fontWeight: "bold" }}>
            CHARACTER PROGRESS
          </MDTypography>
        </MDBox>
        <MDTypography variant="h4" fontWeight="medium" sx={{ color: "white" }}>
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
              color: "#64748b",
              textTransform: "none",
              minHeight: "40px",
              fontSize: "0.75rem",
              fontWeight: "bold",
              "&.Mui-selected": {
                color: "#f97316",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#f97316",
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
              borderColor: "#334155",
              color: "#94a3b8",
              textTransform: "none",
              borderRadius: "8px",
              "&:hover": {
                borderColor: "#475569",
                backgroundColor: "#1e293b",
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
              backgroundColor: "#f97316",
              color: "white",
              textTransform: "none",
              borderRadius: "8px",
              "&:hover": {
                backgroundColor: "#ea580c",
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
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          boxShadow: "none",
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  USER ID
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  METRIC NAME
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  PROGRESS (CURRENT / MAX)
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  RAW VALUE
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  UPDATED AT
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
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
                    <TableRow key={`${progress.user_id}-${firstMetricName}`} hover sx={{ "&:hover": { backgroundColor: "#334155" } }}>
                      <TableCell sx={{ borderColor: "#334155" }}>
                        <UserAvatar username={`USR-${progress.user_id}`} />
                      </TableCell>
                      <TableCell sx={{ borderColor: "#334155" }}>
                        <Chip
                          label={metricLabel}
                          size="small"
                          sx={{
                            backgroundColor: metricColor,
                            color: "white",
                            fontSize: "0.625rem",
                            height: "20px",
                            fontWeight: "bold",
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderColor: "#334155", minWidth: "200px" }}>
                        <ProgressBar
                          current={metric?.current_value || 0}
                          max={metric?.max_value || 100}
                          label={metricLabel}
                          color={metricColor}
                        />
                      </TableCell>
                      <TableCell sx={{ color: "white", borderColor: "#334155", fontWeight: "bold" }}>
                        {metric?.current_value || 0}
                      </TableCell>
                      <TableCell sx={{ color: "#94a3b8", borderColor: "#334155", fontSize: "0.75rem" }}>
                        {formatRelativeTime(metric?.updated_at)}
                      </TableCell>
                      <TableCell sx={{ borderColor: "#334155" }}>
                        <IconButton
                          size="small"
                          sx={{
                            color: "#64748b",
                            "&:hover": {
                              color: "#f97316",
                              backgroundColor: "#334155",
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
            color: "#94a3b8",
            borderTop: "1px solid #334155",
            "& .MuiTablePagination-selectIcon": {
              color: "#94a3b8",
            },
            "& .MuiTablePagination-actions button": {
              color: "#94a3b8",
            },
          }}
        />
      </Card>

      {/* Footer text */}
      <MDBox mt={2}>
        <MDTypography variant="caption" sx={{ color: "#64748b" }}>
          Showing {filteredData.length > 0 ? 1 : 0} of {filteredData.length} entries
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}
