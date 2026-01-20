import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { savesApi, exportApi } from "services/api/adminService";
import { useProjects } from "context/projectContext";

// Helper to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

// User ID badge component
function UserIdBadge({ userId }) {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
  const color = colors[Math.abs(userId.charCodeAt(0)) % colors.length];

  return (
    <Chip
      label={`UR ${userId}`}
      size="small"
      sx={{
        backgroundColor: color,
        color: "white",
        fontSize: "0.625rem",
        height: "20px",
        fontWeight: "bold",
      }}
    />
  );
}

// JSON Preview component
function JsonPreview({ data }) {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const formatted = JSON.stringify(parsed, null, 2);

    return (
      <MDBox
        component="pre"
        sx={{
          backgroundColor: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "8px",
          p: 2,
          overflow: "auto",
          maxHeight: "400px",
          fontSize: "0.75rem",
          color: "#94a3b8",
          fontFamily: "'Fira Code', 'Courier New', monospace",
        }}
      >
        {formatted}
      </MDBox>
    );
  } catch (error) {
    return (
      <MDTypography variant="caption" sx={{ color: "#ef4444" }}>
        Invalid JSON data
      </MDTypography>
    );
  }
}

export default function Saves() {
  const { currentProjectId } = useProjects();
  const [saves, setSaves] = useState([]);
  const [filteredSaves, setFilteredSaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedSave, setSelectedSave] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalSaves: 0,
    totalSize: 0,
  });

  useEffect(() => {
    fetchSaves();
  }, [currentProjectId]);

  useEffect(() => {
    // Filter saves based on search query
    if (!searchQuery.trim()) {
      setFilteredSaves(saves);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = saves.filter(
        (save) =>
          save.id.toLowerCase().includes(query) ||
          (save.username && save.username.toLowerCase().includes(query))
      );
      setFilteredSaves(filtered);
      setPage(0);
    }
  }, [searchQuery, saves]);

  const fetchSaves = async () => {
    setLoading(true);
    try {
      const data = await savesApi.list();
      setSaves(data.saves || []);
      setFilteredSaves(data.saves || []);
      setStats({
        totalSaves: data.count || 0,
        totalSize: data.totalSize || 0,
      });
    } catch (error) {
      console.error("Error fetching saves:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSave = async (saveId) => {
    try {
      const data = await savesApi.getById(saveId);
      setSelectedSave(data.save);
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Error fetching save details:", error);
    }
  };

  const handleCloseDialog = () => {
    setViewDialogOpen(false);
    setSelectedSave(null);
  };

  const handleExport = async () => {
    try {
      await exportApi.saves();
    } catch (error) {
      console.error("Error exporting saves:", error);
    }
  };

  const handlePruneOld = () => {
    // TODO: Implement prune old saves
    console.log("Prune old saves");
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedSaves = filteredSaves.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <MDBox pt={4} pb={6} px={3} sx={{ backgroundColor: "#0f172a", minHeight: "100vh" }}>
      {/* Header */}
      <MDBox mb={3}>
        <MDBox display="flex" alignItems="center" gap={1} mb={1}>
          <MDTypography variant="caption" sx={{ color: "#64748b" }}>
            Database
          </MDTypography>
          <Icon sx={{ color: "#64748b", fontSize: "1rem" }}>chevron_right</Icon>
          <MDTypography variant="caption" sx={{ color: "#f97316", fontWeight: "bold" }}>
            Game Saves
          </MDTypography>
        </MDBox>
        <MDTypography variant="h4" fontWeight="medium" sx={{ color: "white" }}>
          Game Saves Database
        </MDTypography>
        <MDBox display="flex" alignItems="center" gap={0.5} mt={0.5}>
          <Icon sx={{ color: "#64748b", fontSize: "1rem" }}>info</Icon>
          <MDTypography variant="caption" sx={{ color: "#64748b" }}>
            Showing all persisted game state snapshots
          </MDTypography>
        </MDBox>
      </MDBox>

      {/* Stats Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              boxShadow: "none",
              p: 2,
            }}
          >
            <MDBox display="flex" alignItems="center" gap={2}>
              <MDBox
                display="flex"
                justifyContent="center"
                alignItems="center"
                width="3rem"
                height="3rem"
                borderRadius="8px"
                sx={{ backgroundColor: "#3b82f6" }}
              >
                <Icon sx={{ color: "white" }}>cloud_upload</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                  TOTAL SAVES
                </MDTypography>
                <MDTypography variant="h5" fontWeight="bold" sx={{ color: "white" }}>
                  {stats.totalSaves.toLocaleString()}
                </MDTypography>
              </MDBox>
            </MDBox>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              boxShadow: "none",
              p: 2,
            }}
          >
            <MDBox display="flex" alignItems="center" gap={2}>
              <MDBox
                display="flex"
                justifyContent="center"
                alignItems="center"
                width="3rem"
                height="3rem"
                borderRadius="8px"
                sx={{ backgroundColor: "#10b981" }}
              >
                <Icon sx={{ color: "white" }}>storage</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                  STORAGE USED
                </MDTypography>
                <MDTypography variant="h5" fontWeight="bold" sx={{ color: "white" }}>
                  {formatBytes(stats.totalSize)}
                </MDTypography>
              </MDBox>
            </MDBox>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Actions */}
      <MDBox display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Search by User ID or Save ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              color: "#ffffff",
              backgroundColor: "#1e293b",
              borderRadius: "8px",
              "& fieldset": {
                borderColor: "#334155",
              },
              "&:hover fieldset": {
                borderColor: "#475569",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#f97316",
              },
            },
            "& .MuiInputBase-input::placeholder": {
              color: "#64748b",
              opacity: 1,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Icon sx={{ color: "#64748b" }}>search</Icon>
              </InputAdornment>
            ),
          }}
        />
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
          Advanced Filters
        </Button>
        <Button
          variant="contained"
          startIcon={<Icon>delete_sweep</Icon>}
          onClick={handlePruneOld}
          sx={{
            backgroundColor: "#ef4444",
            color: "white",
            textTransform: "none",
            borderRadius: "8px",
            "&:hover": {
              backgroundColor: "#dc2626",
            },
          }}
        >
          Prune Old
        </Button>
      </MDBox>

      {/* Saves Table */}
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
                  SAVE ID
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  USER ID
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  JSON DATA PREVIEW
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  CREATED AT
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ color: "#94a3b8", borderColor: "#334155", py: 4 }}>
                    Loading saves...
                  </TableCell>
                </TableRow>
              ) : paginatedSaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ color: "#94a3b8", borderColor: "#334155", py: 4 }}>
                    No saves found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSaves.map((save) => (
                  <TableRow key={save.id} hover sx={{ "&:hover": { backgroundColor: "#334155" } }}>
                    <TableCell sx={{ borderColor: "#334155" }}>
                      <MDTypography variant="button" fontWeight="medium" sx={{ color: "#f97316" }}>
                        {save.id}
                      </MDTypography>
                    </TableCell>
                    <TableCell sx={{ borderColor: "#334155" }}>
                      <UserIdBadge userId={save.id.split("_")[0] || "unknown"} />
                    </TableCell>
                    <TableCell sx={{ color: "#94a3b8", borderColor: "#334155", maxWidth: "400px" }}>
                      <MDTypography
                        variant="caption"
                        sx={{
                          fontFamily: "'Fira Code', monospace",
                          fontSize: "0.75rem",
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {save.data_preview}
                      </MDTypography>
                    </TableCell>
                    <TableCell sx={{ color: "#94a3b8", borderColor: "#334155", fontSize: "0.75rem" }}>
                      {new Date(save.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ borderColor: "#334155" }}>
                      <IconButton
                        size="small"
                        onClick={() => handleViewSave(save.id)}
                        sx={{
                          color: "#64748b",
                          "&:hover": {
                            color: "#f97316",
                            backgroundColor: "#334155",
                          },
                        }}
                      >
                        <Icon fontSize="small">visibility</Icon>
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredSaves.length}
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

      {/* Info Cards */}
      <Grid container spacing={2} mt={2}>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              boxShadow: "none",
              p: 3,
            }}
          >
            <MDBox display="flex" alignItems="center" gap={2} mb={2}>
              <MDBox
                display="flex"
                justifyContent="center"
                alignItems="center"
                width="3rem"
                height="3rem"
                borderRadius="8px"
                sx={{ backgroundColor: "#f59e0b" }}
              >
                <Icon sx={{ color: "white" }}>database</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="h6" fontWeight="medium" sx={{ color: "white" }}>
                  Storage Optimization
                </MDTypography>
                <MDTypography variant="caption" sx={{ color: "#64748b" }}>
                  Remove old saves that are eligible for pruning.
                </MDTypography>
              </MDBox>
            </MDBox>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <MDTypography variant="caption" sx={{ color: "#94a3b8" }}>
                PRUNEABLE DATA
              </MDTypography>
              <MDTypography variant="h6" fontWeight="bold" sx={{ color: "#f59e0b" }}>
                2.4 GB
              </MDTypography>
            </MDBox>
            <Button
              variant="outlined"
              fullWidth
              sx={{
                borderColor: "#334155",
                color: "#94a3b8",
                textTransform: "none",
                borderRadius: "8px",
                "&:hover": {
                  borderColor: "#475569",
                  backgroundColor: "#334155",
                },
              }}
            >
              Analyze
            </Button>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              boxShadow: "none",
              p: 3,
            }}
          >
            <MDBox display="flex" alignItems="center" gap={2} mb={2}>
              <MDBox
                display="flex"
                justifyContent="center"
                alignItems="center"
                width="3rem"
                height="3rem"
                borderRadius="8px"
                sx={{ backgroundColor: "#3b82f6" }}
              >
                <Icon sx={{ color: "white" }}>download</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="h6" fontWeight="medium" sx={{ color: "white" }}>
                  Recent Export
                </MDTypography>
                <MDTypography variant="caption" sx={{ color: "#64748b" }}>
                  Database snapshot generated successfully.
                </MDTypography>
              </MDBox>
            </MDBox>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <MDTypography variant="caption" sx={{ color: "#94a3b8" }}>
                game_saves_production_v2.sql.gz
              </MDTypography>
            </MDBox>
            <MDTypography variant="caption" sx={{ color: "#64748b", display: "block", mb: 2 }}>
              Yesterday at 23:00 UTC / 5.2 MB
            </MDTypography>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleExport}
              sx={{
                borderColor: "#334155",
                color: "#94a3b8",
                textTransform: "none",
                borderRadius: "8px",
                "&:hover": {
                  borderColor: "#475569",
                  backgroundColor: "#334155",
                },
              }}
            >
              Export New
            </Button>
          </Card>
        </Grid>
      </Grid>

      {/* View Save Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
          },
        }}
      >
        <DialogTitle sx={{ color: "white", borderBottom: "1px solid #334155" }}>
          Save Details: {selectedSave?.id}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedSave && (
            <MDBox>
              <MDTypography variant="button" sx={{ color: "#64748b", display: "block", mb: 1 }}>
                Save Data (JSON):
              </MDTypography>
              <JsonPreview data={selectedSave.save_data} />
            </MDBox>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #334155", p: 2 }}>
          <Button
            onClick={handleCloseDialog}
            sx={{
              color: "#94a3b8",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#334155",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </MDBox>
  );
}
