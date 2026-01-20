import { useState, useEffect } from 'react';
import Icon from '@mui/material/Icon';

import MDBox from 'components/MDBox';
import MDTypography from 'components/MDTypography';
import MDInput from 'components/MDInput';
import MDButton from 'components/MDButton';
import MDSnackbar from 'components/MDSnackbar';

import DataTable from 'components/DataTable';
import UserDetailsModal from 'components/UserDetailsModal';

import { userService } from 'services/api/userService';

function Users() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, color: 'info', message: '' });

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        const filtered = users.filter(
          (user) =>
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.id.toString().includes(searchQuery)
        );
        setFilteredUsers(filtered);
      } else {
        setFilteredUsers(users);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAll();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (err) {
      setError(err.message);
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const data = await userService.getById(userId);
      setSelectedUser(data.user);
      setModalOpen(true);
    } catch (err) {
      showToast('error', `Failed to load user: ${err.message}`);
    }
  };

  const showToast = (color, message) => {
    setToast({
      open: true,
      color,
      message,
      time: new Date().toLocaleTimeString(),
    });
  };

  const handleCloseToast = () => setToast((current) => ({ ...current, open: false }));

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  // Table columns configuration
  const columns = [
    { Header: 'ID', accessor: 'id', width: '10%' },
    { Header: 'Username', accessor: 'username', width: '25%' },
    {
      Header: 'Created',
      accessor: 'created_at',
      width: '20%',
      Cell: ({ row }) => (
        <MDTypography variant="button" fontWeight="regular">
          {formatDate(row.original.created_at)}
        </MDTypography>
      ),
    },
    {
      Header: 'Last Login',
      accessor: 'last_login',
      width: '20%',
      Cell: ({ row }) => (
        <MDTypography variant="button" fontWeight="regular">
          {formatDate(row.original.last_login)}
        </MDTypography>
      ),
    },
    { Header: 'Login Count', accessor: 'login_count', width: '15%' },
    {
      Header: 'Actions',
      accessor: 'actions',
      width: '10%',
      Cell: ({ row }) => (
        <MDButton
          variant="text"
          color="info"
          size="small"
          onClick={() => handleViewUser(row.original.id)}
        >
          <Icon sx={{ mr: 0.5 }}>visibility</Icon>
          View
        </MDButton>
      ),
    },
  ];

  return (
    <MDBox p={3}>
      {/* Header */}
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <MDBox>
          <MDTypography variant="h4" fontWeight="medium" color="dark">
            Users Management
          </MDTypography>
          <MDTypography variant="body2" color="text">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            {searchQuery && ` (filtered from ${users.length})`}
          </MDTypography>
        </MDBox>
        <MDBox display="flex" gap={2}>
          <MDInput
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              endAdornment: searchQuery && (
                <Icon
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSearchQuery('')}
                >
                  clear
                </Icon>
              ),
            }}
          />
          <MDButton variant="outlined" color="info" onClick={loadUsers}>
            <Icon sx={{ mr: 1 }}>refresh</Icon>
            Refresh
          </MDButton>
        </MDBox>
      </MDBox>

      {/* Error State */}
      {error && (
        <MDBox mb={3} p={2} bgColor="error" borderRadius="lg" sx={{ opacity: 0.2 }}>
          <MDTypography variant="body2" color="white">
            Error: {error}
          </MDTypography>
          <MDButton variant="outlined" color="white" size="small" onClick={loadUsers} sx={{ mt: 1 }}>
            Retry
          </MDButton>
        </MDBox>
      )}

      {/* Table */}
      <DataTable
        table={{ columns, rows: filteredUsers }}
        loading={loading}
        emptyMessage={searchQuery ? 'No users match your search' : 'No users found'}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        open={modalOpen}
        user={selectedUser}
        onClose={() => setModalOpen(false)}
      />

      {/* Toast Notifications */}
      <MDSnackbar
        color={toast.color}
        icon={<Icon>{toast.color === 'error' ? 'error' : 'check_circle'}</Icon>}
        title={toast.color === 'error' ? 'Error' : 'Success'}
        dateTime={toast.time || ''}
        content={toast.message || ''}
        open={toast.open}
        onClose={handleCloseToast}
        close={handleCloseToast}
        bgWhite={toast.color === 'light'}
      />
    </MDBox>
  );
}

export default Users;
