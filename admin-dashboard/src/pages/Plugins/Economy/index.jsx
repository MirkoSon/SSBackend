import { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
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
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import { economyApi } from "services/api/adminService";
import { useMaterialUIController } from "context";

// Helper components
function CurrencyBadge({ currency, balance }) {
    const isPositive = balance >= 0;
    return (
        <MDBox display="flex" alignItems="center" mr={1} mb={0.5}>
            <MDTypography
                variant="caption"
                fontWeight="bold"
                sx={{
                    color: isPositive ? "#10b981" : "#ef4444",
                    backgroundColor: isPositive ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    px: 1,
                    borderRadius: "4px",
                    mr: 0.5
                }}
            >
                {new Intl.NumberFormat().format(balance)}
            </MDTypography>
            <MDTypography variant="caption" sx={{ color: "#94a3b8" }}>
                {currency.symbol || currency.name}
            </MDTypography>
        </MDBox>
    );
}

export default function EconomyManagement() {
    const [controller] = useMaterialUIController();
    const { darkMode } = controller;

    const [users, setUsers] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currencyFilter, setCurrencyFilter] = useState("all");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Modals state
    const [adjustmentModal, setAdjustmentModal] = useState({
        open: false,
        user: null,
        currency: "",
        amount: 0,
        type: "set" // 'set' or 'add'
    });

    const [historyModal, setHistoryModal] = useState({
        open: false,
        user: null,
        history: [],
        loading: false
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [searchQuery, currencyFilter, users]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [usersData, currenciesData] = await Promise.all([
                economyApi.getUsers(),
                economyApi.getCurrencies()
            ]);
            setUsers(usersData || []);
            setCurrencies(currenciesData || []);
        } catch (error) {
            console.error("Error fetching economy data:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...users];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.username?.toLowerCase().includes(query) ||
                u.id.toString().includes(query) ||
                u.email?.toLowerCase().includes(query)
            );
        }

        if (currencyFilter !== "all") {
            result = result.filter(u => u.balances && u.balances[currencyFilter] !== undefined);
        }

        setFilteredUsers(result);
        setPage(0);
    };

    const handleOpenAdjustment = (user) => {
        setAdjustmentModal({
            open: true,
            user,
            currency: currencies[0]?.id || "",
            amount: 0,
            type: "set"
        });
    };

    const handleCloseAdjustment = () => {
        setAdjustmentModal({ ...adjustmentModal, open: false });
    };

    const handleSaveAdjustment = async () => {
        try {
            const payload = {
                currencyId: adjustmentModal.currency,
                amount: adjustmentModal.amount,
                type: adjustmentModal.type,
            };
            await economyApi.adjustBalance(adjustmentModal.user.id, payload);
            handleCloseAdjustment();
            fetchInitialData(); // Refresh
        } catch (error) {
            console.error("Error adjusting balance:", error);
        }
    };

    const handleShowHistory = async (user) => {
        setHistoryModal({ open: true, user, history: [], loading: true });
        try {
            const history = await economyApi.getUserTransactions(user.id);
            setHistoryModal(prev => ({ ...prev, history, loading: false }));
        } catch (error) {
            console.error("Error fetching history:", error);
            setHistoryModal(prev => ({ ...prev, loading: false }));
        }
    };

    const handleExport = async () => {
        try {
            const blob = await economyApi.exportBalances(filteredUsers.map(u => u.id));
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `economy-export-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
        }
    };

    const paginatedUsers = filteredUsers.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    return (
        <MDBox>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <MDBox>
                    <MDTypography variant="h4" fontWeight="bold" sx={{ color: darkMode ? "white" : "#1e293b" }}>
                        Economy Management
                    </MDTypography>
                    <MDTypography variant="caption" sx={{ color: "#64748b" }}>
                        Monitor and manage user balances across all currencies
                    </MDTypography>
                </MDBox>
                <MDBox display="flex" gap={1}>
                    <MDButton variant="outlined" color="info" startIcon={<Icon>download</Icon>} onClick={handleExport}>
                        Export CSV
                    </MDButton>
                    <MDButton variant="gradient" color="info" startIcon={<Icon>refresh</Icon>} onClick={fetchInitialData}>
                        Refresh
                    </MDButton>
                </MDBox>
            </MDBox>

            {/* Filters */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={8}>
                    <TextField
                        fullWidth
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Icon>search</Icon>
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                borderRadius: "12px",
                                backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                border: "none",
                                "& fieldset": { border: "none" }
                            }
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small">
                        <Select
                            value={currencyFilter}
                            onChange={(e) => setCurrencyFilter(e.target.value)}
                            sx={{
                                borderRadius: "12px",
                                backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                height: "44.13px"
                            }}
                        >
                            <MenuItem value="all">All Currencies</MenuItem>
                            {currencies.map(c => (
                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

            {/* Table */}
            <Card sx={{
                borderRadius: "24px",
                backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                boxShadow: "none",
                overflow: "hidden"
            }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ display: "table-header-group", backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }}>
                            <TableRow>
                                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>USER</TableCell>
                                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>BALANCES</TableCell>
                                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>STATUS</TableCell>
                                <TableCell align="right" sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>ACTIONS</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} align="center">Loading...</TableCell></TableRow>
                            ) : paginatedUsers.map((user) => (
                                <TableRow key={user.id} hover sx={{ "&:hover": { backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' } }}>
                                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                                        <MDBox>
                                            <MDTypography variant="button" fontWeight="bold" display="block" sx={{ color: darkMode ? "white" : "#1e293b" }}>
                                                {user.username || "Unknown"}
                                            </MDTypography>
                                            <MDTypography variant="caption" sx={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "10px" }}>
                                                #{user.id}
                                            </MDTypography>
                                        </MDBox>
                                    </TableCell>
                                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                                        <MDBox display="flex" flexWrap="wrap">
                                            {currencies.map(c => (
                                                <CurrencyBadge
                                                    key={c.id}
                                                    currency={c}
                                                    balance={user.balances ? (user.balances[c.id] || 0) : 0}
                                                />
                                            ))}
                                        </MDBox>
                                    </TableCell>
                                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                                        <MDTypography variant="caption" sx={{
                                            color: user.status === 'active' ? '#10b981' : '#94a3b8',
                                            fontWeight: "bold",
                                            textTransform: "uppercase",
                                            fontSize: "10px"
                                        }}>
                                            {user.status || 'active'}
                                        </MDTypography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                                        <IconButton size="small" onClick={() => handleShowHistory(user)} title="History">
                                            <Icon sx={{ color: "#94a3b8" }}>history</Icon>
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleOpenAdjustment(user)} title="Adjust">
                                            <Icon sx={{ color: "#ff5722" }}>edit</Icon>
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={filteredUsers.length}
                    page={page}
                    onPageChange={(e, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                />
            </Card>

            {/* Adjustment Dialog */}
            <Dialog open={adjustmentModal.open} onClose={handleCloseAdjustment} maxWidth="xs" fullWidth
                PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}>
                <DialogTitle>Adjust Balance</DialogTitle>
                <DialogContent>
                    <MDBox mt={2}>
                        <MDTypography variant="button" sx={{ color: "#64748b" }}>
                            User: {adjustmentModal.user?.username} (ID: {adjustmentModal.user?.id})
                        </MDTypography>
                        <MDBox mt={3}>
                            <FormControl fullWidth>
                                <InputLabel>Currency</InputLabel>
                                <Select
                                    value={adjustmentModal.currency}
                                    onChange={(e) => setAdjustmentModal({ ...adjustmentModal, currency: e.target.value })}
                                    label="Currency"
                                    sx={{ height: "45px" }}
                                >
                                    {currencies.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </MDBox>
                        <MDBox mt={3}>
                            <FormControl fullWidth>
                                <InputLabel>Adjustment Type</InputLabel>
                                <Select
                                    value={adjustmentModal.type}
                                    onChange={(e) => setAdjustmentModal({ ...adjustmentModal, type: e.target.value })}
                                    label="Adjustment Type"
                                    sx={{ height: "45px" }}
                                >
                                    <MenuItem value="set">Set Fixed Value</MenuItem>
                                    <MenuItem value="add">Add (or subtract if negative)</MenuItem>
                                </Select>
                            </FormControl>
                        </MDBox>
                        <MDBox mt={3}>
                            <MDInput
                                type="number"
                                label="Amount"
                                fullWidth
                                value={adjustmentModal.amount}
                                onChange={(e) => setAdjustmentModal({ ...adjustmentModal, amount: parseFloat(e.target.value) })}
                            />
                        </MDBox>
                    </MDBox>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAdjustment} sx={{ color: "#94a3b8" }}>Cancel</Button>
                    <MDButton variant="gradient" color="info" onClick={handleSaveAdjustment}>Save Changes</MDButton>
                </DialogActions>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={historyModal.open} onClose={() => setHistoryModal({ ...historyModal, open: false })} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}>
                <DialogTitle>Transaction History: {historyModal.user?.username}</DialogTitle>
                <DialogContent>
                    {historyModal.loading ? <MDTypography>Loading...</MDTypography> : (
                        <MDBox mt={2}>
                            {historyModal.history.length === 0 ? <MDTypography variant="body2">No transactions found.</MDTypography> : (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontSize: "10px", fontWeight: "bold" }}>DATE</TableCell>
                                            <TableCell sx={{ fontSize: "10px", fontWeight: "bold" }}>TYPE</TableCell>
                                            <TableCell sx={{ fontSize: "10px", fontWeight: "bold" }}>AMOUNT</TableCell>
                                            <TableCell sx={{ fontSize: "10px", fontWeight: "bold" }}>COMMENT</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {historyModal.history.map((tx, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell sx={{ fontSize: "11px" }}>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell sx={{ fontSize: "11px" }}>{tx.type}</TableCell>
                                                <TableCell sx={{ fontSize: "11px", color: tx.amount >= 0 ? "#10b981" : "#ef4444" }}>
                                                    {tx.amount > 0 ? "+" : ""}{tx.amount} {tx.currency_id}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: "11px" }}>{tx.description || tx.source}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </MDBox>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHistoryModal({ ...historyModal, open: false })} sx={{ color: "#94a3b8" }}>Close</Button>
                </DialogActions>
            </Dialog>
        </MDBox>
    );
}
