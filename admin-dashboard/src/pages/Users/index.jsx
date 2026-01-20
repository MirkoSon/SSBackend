import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { usersApi } from "services/api/adminService";
import { useProjects } from "context/projectContext";

// Helper function to format relative time
function formatRelativeTime(dateString) {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

// User avatar component with initials
function UserAvatar({ username, color }) {
  const initials = username
    ? username
        .split("_")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <MDBox
      display="flex"
      justifyContent="center"
      alignItems="center"
      width="2.5rem"
      height="2.5rem"
      borderRadius="8px"
      sx={{
        backgroundColor: color || "#3b82f6",
        color: "white",
        fontWeight: "bold",
        fontSize: "0.875rem",
      }}
    >
      {initials}
    </MDBox>
  );
}

// Get random color for avatar
function getAvatarColor(index) {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
  return colors[index % colors.length];
}

export default function Users() {
  const { currentProjectId } = useProjects();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, [currentProjectId]);

  useEffect(() => {
    // Filter users based on search query
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.id.toString().includes(query)
      );
      setFilteredUsers(filtered);
      setPage(0); // Reset to first page when filtering
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.list();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const activeToday = (data.users || []).filter((user) => {
        const lastLogin = new Date(user.last_login);
        return lastLogin >= todayStart;
      }).length;

      setStats({
        totalUsers: data.count || 0,
        activeToday,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddUser = () => {
    // TODO: Implement add user dialog
    console.log("Add user");
  };

  const handleEditUser = (userId) => {
    // TODO: Implement edit user dialog
    console.log("Edit user:", userId);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }
    // TODO: Implement delete user
    console.log("Delete user:", userId);
  };

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <MDBox pt={4} pb={6} px={3} sx={{ backgroundColor: "#0f172a", minHeight: "100vh" }}>
      {/* Header with Breadcrumb */}
      <MDBox mb={3}>
        <MDBox display="flex" alignItems="center" gap={1} mb={1}>
          <MDTypography variant="caption" sx={{ color: "#64748b" }}>
            Database
          </MDTypography>
          <Icon sx={{ color: "#64748b", fontSize: "1rem" }}>chevron_right</Icon>
          <MDTypography variant="caption" sx={{ color: "#f97316", fontWeight: "bold" }}>
            Users
          </MDTypography>
        </MDBox>
        <MDTypography variant="h4" fontWeight="medium" sx={{ color: "white" }}>
          Users Database
        </MDTypography>
        <MDTypography variant="caption" sx={{ color: "#94a3b8" }}>
          Manage and monitor your application's user base.
        </MDTypography>
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
                <Icon sx={{ color: "white" }}>people</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                  TOTAL USERS
                </MDTypography>
                <MDTypography variant="h5" fontWeight="bold" sx={{ color: "white" }}>
                  {stats.totalUsers.toLocaleString()}
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
                <Icon sx={{ color: "white" }}>bolt</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                  ACTIVE TODAY
                </MDTypography>
                <MDTypography variant="h5" fontWeight="bold" sx={{ color: "white" }}>
                  {stats.activeToday.toLocaleString()}
                </MDTypography>
              </MDBox>
            </MDBox>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Actions */}
      <MDBox display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Search by username, ID or email..."
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
          variant="contained"
          startIcon={<Icon>person_add</Icon>}
          onClick={handleAddUser}
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
          Add User
        </Button>
      </MDBox>

      {/* Users Table */}
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
                  USERNAME
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  PASSWORD
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  CREATED AT
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  LAST LOGIN
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  LOGINS
                </TableCell>
                <TableCell sx={{ color: "#64748b", borderColor: "#334155", fontSize: "0.75rem", fontWeight: "bold" }}>
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: "#94a3b8", borderColor: "#334155", py: 4 }}>
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: "#94a3b8", borderColor: "#334155", py: 4 }}>
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user, index) => (
                  <TableRow key={user.id} hover sx={{ "&:hover": { backgroundColor: "#334155" } }}>
                    <TableCell sx={{ color: "#64748b", borderColor: "#334155" }}>
                      #{user.id}
                    </TableCell>
                    <TableCell sx={{ borderColor: "#334155" }}>
                      <MDBox display="flex" alignItems="center" gap={2}>
                        <UserAvatar username={user.username} color={getAvatarColor(index)} />
                        <MDTypography variant="button" fontWeight="medium" sx={{ color: "white" }}>
                          {user.username}
                        </MDTypography>
                      </MDBox>
                    </TableCell>
                    <TableCell sx={{ color: "#64748b", borderColor: "#334155" }}>
                      ••••••••••••••••
                    </TableCell>
                    <TableCell sx={{ color: "#94a3b8", borderColor: "#334155", fontSize: "0.75rem" }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{ color: "#94a3b8", borderColor: "#334155", fontSize: "0.75rem" }}>
                      {formatRelativeTime(user.last_login)}
                    </TableCell>
                    <TableCell sx={{ borderColor: "#334155" }}>
                      <Chip
                        label={user.login_count || 0}
                        size="small"
                        sx={{
                          backgroundColor: "#334155",
                          color: "#94a3b8",
                          fontSize: "0.75rem",
                          height: "24px",
                          fontWeight: "bold",
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderColor: "#334155" }}>
                      <MDBox display="flex" gap={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user.id)}
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
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteUser(user.id)}
                          sx={{
                            color: "#64748b",
                            "&:hover": {
                              color: "#ef4444",
                              backgroundColor: "#334155",
                            },
                          }}
                        >
                          <Icon fontSize="small">delete</Icon>
                        </IconButton>
                      </MDBox>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredUsers.length}
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
          Showing {page * rowsPerPage + 1}-
          {Math.min((page + 1) * rowsPerPage, filteredUsers.length)} of {filteredUsers.length}{" "}
          users
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}
