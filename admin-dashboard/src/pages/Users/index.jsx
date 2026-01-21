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
import { useMaterialUIController } from "context";

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
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

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
      width="32px"
      height="32px"
      borderRadius="50%"
      sx={{
        backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        color: color || "#ff5722",
        fontWeight: "bold",
        fontSize: "11px",
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
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
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
    <MDBox pt={4} pb={6} px={3} sx={{ backgroundColor: 'transparent' }}>
      {/* Header */}
      <MDBox mb={5} display="flex" justifyContent="space-between" alignItems="flex-end">
        <MDBox>
          <MDBox display="flex" alignItems="center" gap={1} mb={1}>
            <MDTypography variant="caption" fontWeight="medium" sx={{ color: darkMode ? '#ffffff88' : '#64748b' }}>
              Database
            </MDTypography>
            <Icon sx={{ color: "#94a3b8", fontSize: "1rem" }}>chevron_right</Icon>
            <MDTypography variant="caption" sx={{ color: '#ff5722', fontWeight: "bold" }}>
              Users
            </MDTypography>
          </MDBox>
          <MDTypography variant="h3" fontWeight="bold" sx={{ color: darkMode ? 'white' : '#1e293b', letterSpacing: '-0.02em' }}>
            Users Database
          </MDTypography>
          <MDTypography variant="button" sx={{ color: darkMode ? '#94a3b8' : '#64748b', mt: 0.5, display: 'block' }}>
            Manage and monitor your application's user base.
          </MDTypography>
        </MDBox>
        <MDBox display="flex" alignItems="center" bgcolor={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} px={2} py={1} borderRadius="12px">
          <Icon sx={{ color: '#ff5722', fontSize: "1.25rem", mr: 1 }}>group</Icon>
          <MDTypography variant="button" fontWeight="bold" sx={{ color: darkMode ? 'white' : '#1e293b' }}>
            {stats.totalUsers.toLocaleString()} Users
          </MDTypography>
        </MDBox>
      </MDBox>

      {/* Stats Cards */}
      <Grid container spacing={4} mb={6}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              boxShadow: "none",
              borderRadius: '24px',
              p: 2.5,
            }}
          >
            <MDBox display="flex" alignItems="center" gap={2}>
              <MDBox
                display="flex"
                justifyContent="center"
                alignItems="center"
                width="48px"
                height="48px"
                borderRadius="14px"
                sx={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}
              >
                <Icon>group</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="caption" fontWeight="bold" sx={{ color: darkMode ? '#94a3b8' : '#64748b', fontSize: '10px' }}>
                  TOTAL USERS
                </MDTypography>
                <MDTypography variant="h4" fontWeight="bold" sx={{ color: darkMode ? 'white' : '#1e293b' }}>
                  {stats.totalUsers.toLocaleString()}
                </MDTypography>
              </MDBox>
            </MDBox>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              boxShadow: "none",
              borderRadius: '24px',
              p: 2.5,
            }}
          >
            <MDBox display="flex" alignItems="center" gap={2}>
              <MDBox
                display="flex"
                justifyContent="center"
                alignItems="center"
                width="48px"
                height="48px"
                borderRadius="14px"
                sx={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}
              >
                <Icon>bolt</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="caption" fontWeight="bold" sx={{ color: darkMode ? '#94a3b8' : '#64748b', fontSize: '10px' }}>
                  ACTIVE TODAY
                </MDTypography>
                <MDTypography variant="h4" fontWeight="bold" sx={{ color: darkMode ? 'white' : '#1e293b' }}>
                  {stats.activeToday.toLocaleString()}
                </MDTypography>
              </MDBox>
            </MDBox>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Actions */}
      <MDBox display="flex" gap={2} mb={3}>
      {/* Search and Actions */}
      <MDBox display="flex" gap={2} mb={4}>
        <TextField
          placeholder="Search by username, ID or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              color: darkMode ? "#ffffff" : "#1e293b",
              backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: "12px",
              "& fieldset": {
                border: 'none',
              },
              "&.Mui-focused fieldset": {
                border: `2px solid #ff5722`,
              },
            },
            "& .MuiInputBase-input::placeholder": {
              color: darkMode ? "#94a3b8" : "#64748b",
              opacity: 1,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Icon sx={{ color: "#94a3b8" }}>search</Icon>
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          startIcon={<Icon>person_add</Icon>}
          onClick={handleAddUser}
          sx={{
            backgroundColor: "#ff5722",
            color: "white",
            textTransform: "none",
            borderRadius: "12px",
            fontWeight: "bold",
            px: 3,
            boxShadow: '0 4px 12px rgba(255, 87, 34, 0.2)',
            "&:hover": {
              backgroundColor: "#e64a19",
              boxShadow: '0 6px 16px rgba(255, 87, 34, 0.3)',
            },
          }}
        >
          Add User
        </Button>
      </MDBox>
      </MDBox>

      {/* Users Table */}
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
                  USERNAME
                </TableCell>
                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>
                  PASSWORD
                </TableCell>
                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>
                  CREATED AT
                </TableCell>
                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>
                  LAST LOGIN
                </TableCell>
                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em', textAlign: 'center' }}>
                  LOGINS
                </TableCell>
                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em', textAlign: 'right' }}>
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
                  <TableRow key={user.id} hover sx={{ "&:hover": { backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' } }}>
                    <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontFamily: 'monospace', fontSize: '11px' }}>
                      #{user.id}
                    </TableCell>
                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                      <MDBox display="flex" alignItems="center" gap={1.5}>
                        <UserAvatar username={user.username} color={getAvatarColor(index)} />
                        <MDTypography variant="button" fontWeight="bold" sx={{ color: darkMode ? 'white' : '#1e293b' }}>
                          {user.username}
                        </MDTypography>
                      </MDBox>
                    </TableCell>
                    <TableCell sx={{ color: darkMode ? '#94a3b877' : '#64748b77', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: '10px' }}>
                      ••••••••••••••••
                    </TableCell>
                    <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "12px" }}>
                      {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "12px" }}>
                      {formatRelativeTime(user.last_login)}
                    </TableCell>
                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', textAlign: 'center' }}>
                      <MDBox
                        component="span"
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                          borderRadius: '6px',
                          color: darkMode ? 'white' : '#1e293b',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                      >
                        {user.login_count || 0}
                      </MDBox>
                    </TableCell>
                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', textAlign: 'right' }}>
                      <MDBox display="flex" justifyContent="flex-end" gap={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user.id)}
                          sx={{
                            color: "#94a3b8",
                            "&:hover": {
                              color: "#3b82f6",
                              backgroundColor: "rgba(59, 130, 246, 0.1)",
                            },
                          }}
                        >
                          <Icon fontSize="small">edit_square</Icon>
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteUser(user.id)}
                          sx={{
                            color: "#94a3b8",
                            "&:hover": {
                              color: "#ff5722",
                              backgroundColor: "rgba(255, 87, 34, 0.1)",
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
            borderTop: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
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
      <MDBox mt={3} px={1}>
        <MDTypography variant="caption" sx={{ color: darkMode ? '#94a3b8' : '#64748b' }}>
          Showing <strong>{filteredUsers.length > 0 ? page * rowsPerPage + 1 : 0}</strong>-
          <strong>{Math.min((page + 1) * rowsPerPage, filteredUsers.length)}</strong> of <strong>{filteredUsers.length}</strong> users
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}
