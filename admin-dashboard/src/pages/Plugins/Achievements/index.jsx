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
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import { achievementsApi } from "services/api/adminService";
import { useMaterialUIController } from "context";

export default function AchievementsManagement() {
    const [controller] = useMaterialUIController();
    const { darkMode } = controller;

    const [activeTab, setActiveTab] = useState(0);
    const [achievements, setAchievements] = useState([]);
    const [filteredAchievements, setFilteredAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Modal state
    const [modal, setModal] = useState({
        open: false,
        isEdit: false,
        data: {
            code: "",
            name: "",
            description: "",
            type: "incremental",
            metric_name: "",
            target: 1,
            is_active: true,
            season_id: ""
        }
    });

    useEffect(() => {
        fetchAchievements();
    }, []);

    useEffect(() => {
        const query = searchQuery.toLowerCase();
        const filtered = achievements.filter(a =>
            a.name.toLowerCase().includes(query) ||
            a.code.toLowerCase().includes(query) ||
            a.description.toLowerCase().includes(query)
        );
        setFilteredAchievements(filtered);
        setPage(0);
    }, [searchQuery, achievements]);

    const fetchAchievements = async () => {
        setLoading(true);
        try {
            const data = await achievementsApi.list();
            setAchievements(data || []);
        } catch (error) {
            console.error("Error fetching achievements:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (achievement = null) => {
        if (achievement) {
            setModal({ open: true, isEdit: true, data: { ...achievement } });
        } else {
            setModal({
                open: true,
                isEdit: false,
                data: {
                    code: "",
                    name: "",
                    description: "",
                    type: "incremental",
                    metric_name: "",
                    target: 1,
                    is_active: true,
                    season_id: ""
                }
            });
        }
    };

    const handleCloseModal = () => setModal({ ...modal, open: false });

    const handleSaveAchievement = async () => {
        try {
            if (modal.isEdit) {
                await achievementsApi.update(modal.data.id, modal.data);
            } else {
                await achievementsApi.create(modal.data);
            }
            handleCloseModal();
            fetchAchievements();
        } catch (error) {
            console.error("Error saving achievement:", error);
        }
    };

    const handleDeleteAchievement = async (id) => {
        if (window.confirm("Are you sure you want to delete this achievement? User progress will be lost.")) {
            try {
                await achievementsApi.delete(id);
                fetchAchievements();
            } catch (error) {
                console.error("Error deleting achievement:", error);
            }
        }
    };

    const handleToggleActive = async (achievement) => {
        try {
            const updated = { ...achievement, is_active: !achievement.is_active };
            await achievementsApi.update(achievement.id, updated);
            fetchAchievements();
        } catch (error) {
            console.error("Error toggling status:", error);
        }
    };

    const paginatedAchievements = filteredAchievements.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    return (
        <MDBox>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <MDBox>
                    <MDTypography variant="h4" fontWeight="bold" sx={{ color: darkMode ? "white" : "#1e293b" }}>
                        Achievements
                    </MDTypography>
                    <MDTypography variant="caption" sx={{ color: "#64748b" }}>
                        Define and manage game achievements and tracking criteria
                    </MDTypography>
                </MDBox>
                <MDBox display="flex" gap={1}>
                    <MDButton variant="gradient" color="info" startIcon={<Icon>add</Icon>} onClick={() => handleOpenModal()}>
                        New Achievement
                    </MDButton>
                </MDBox>
            </MDBox>

            {/* Tabs */}
            <MDBox mb={3} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} textColor="inherit" indicatorColor="primary">
                    <Tab label="Definitions" sx={{ textTransform: "none", fontWeight: "bold" }} />
                    <Tab label="User Progress" sx={{ textTransform: "none", fontWeight: "bold" }} disabled />
                </Tabs>
            </MDBox>

            {/* Filters */}
            <MDBox mb={3}>
                <TextField
                    fullWidth
                    placeholder="Search achievements by name or code..."
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
            </MDBox>

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
                                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>CODE</TableCell>
                                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>NAME</TableCell>
                                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>TYPE</TableCell>
                                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>TARGET</TableCell>
                                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>METRIC</TableCell>
                                <TableCell sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>STATUS</TableCell>
                                <TableCell align="right" sx={{ color: darkMode ? '#94a3b8' : '#64748b', borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fontSize: "10px", fontWeight: "bold", letterSpacing: '0.05em' }}>ACTIONS</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} align="center">Loading...</TableCell></TableRow>
                            ) : paginatedAchievements.map((a) => (
                                <TableRow key={a.id} hover sx={{ "&:hover": { backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' } }}>
                                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                                        <MDTypography variant="caption" sx={{ fontFamily: "monospace", color: "#ff5722", fontWeight: "bold" }}>
                                            #{a.code}
                                        </MDTypography>
                                    </TableCell>
                                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                                        <MDBox>
                                            <MDTypography variant="button" fontWeight="bold" display="block" sx={{ color: darkMode ? "white" : "#1e293b" }}>
                                                {a.name}
                                            </MDTypography>
                                            <MDTypography variant="caption" sx={{ color: "#94a3b8", fontSize: "10px" }}>
                                                {a.description}
                                            </MDTypography>
                                        </MDBox>
                                    </TableCell>
                                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                                        <MDTypography variant="caption" sx={{
                                            backgroundColor: "rgba(148, 163, 184, 0.1)",
                                            px: 1, py: 0.5, borderRadius: "4px",
                                            color: "#94a3b8", fontWeight: "bold",
                                            fontSize: "10px"
                                        }}>
                                            {a.type.toUpperCase()}
                                        </MDTypography>
                                    </TableCell>
                                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                                        <MDTypography variant="button" fontWeight="bold" sx={{ color: darkMode ? "white" : "#1e293b" }}>{a.target}</MDTypography>
                                    </TableCell>
                                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                                        <MDTypography variant="caption" sx={{ fontFamily: "monospace", color: "#64748b", fontSize: "11px" }}>
                                            {a.metric_name || "-"}
                                        </MDTypography>
                                    </TableCell>
                                    <TableCell sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                                        <Switch
                                            size="small"
                                            checked={!!a.is_active}
                                            onChange={() => handleToggleActive(a)}
                                            color="info"
                                        />
                                    </TableCell>
                                    <TableCell align="right" sx={{ borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
                                        <IconButton size="small" onClick={() => handleOpenModal(a)}>
                                            <Icon sx={{ color: "#94a3b8" }}>edit</Icon>
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleDeleteAchievement(a.id)}>
                                            <Icon sx={{ color: "#ef4444" }}>delete</Icon>
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={filteredAchievements.length}
                    page={page}
                    onPageChange={(e, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                />
            </Card>

            {/* Achievement Dialog */}
            <Dialog open={modal.open} onClose={handleCloseModal} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}>
                <DialogTitle>{modal.isEdit ? "Edit Achievement" : "New Achievement"}</DialogTitle>
                <DialogContent>
                    <MDBox mt={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={8}>
                                <MDInput
                                    label="Achievement Code"
                                    fullWidth
                                    value={modal.data.code}
                                    onChange={(e) => setModal({ ...modal, data: { ...modal.data, code: e.target.value } })}
                                    placeholder="e.g. KILL_100"
                                    disabled={modal.isEdit}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControlLabel
                                    control={<Switch checked={!!modal.data.is_active} onChange={(e) => setModal({ ...modal, data: { ...modal.data, is_active: e.target.checked } })} color="info" />}
                                    label="Active"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <MDInput
                                    label="Name"
                                    fullWidth
                                    value={modal.data.name}
                                    onChange={(e) => setModal({ ...modal, data: { ...modal.data, name: e.target.value } })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <MDInput
                                    label="Description"
                                    fullWidth
                                    multiline
                                    rows={2}
                                    value={modal.data.description}
                                    onChange={(e) => setModal({ ...modal, data: { ...modal.data, description: e.target.value } })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Type</InputLabel>
                                    <Select
                                        value={modal.data.type}
                                        onChange={(e) => setModal({ ...modal, data: { ...modal.data, type: e.target.value } })}
                                        label="Type"
                                        sx={{ height: "45px" }}
                                    >
                                        <MenuItem value="incremental">Incremental</MenuItem>
                                        <MenuItem value="one-shot">One-Shot</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <MDInput
                                    type="number"
                                    label="Target Value"
                                    fullWidth
                                    value={modal.data.target}
                                    onChange={(e) => setModal({ ...modal, data: { ...modal.data, target: parseInt(e.target.value) } })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <MDInput
                                    label="Metric Name"
                                    fullWidth
                                    value={modal.data.metric_name}
                                    onChange={(e) => setModal({ ...modal, data: { ...modal.data, metric_name: e.target.value } })}
                                    placeholder="e.g. kills, wins"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <MDInput
                                    label="Season ID (Optional)"
                                    fullWidth
                                    value={modal.data.season_id || ""}
                                    onChange={(e) => setModal({ ...modal, data: { ...modal.data, season_id: e.target.value } })}
                                    placeholder="e.g. S1"
                                />
                            </Grid>
                        </Grid>
                    </MDBox>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal} sx={{ color: "#94a3b8" }}>Cancel</Button>
                    <MDButton variant="gradient" color="info" onClick={handleSaveAchievement}>
                        {modal.isEdit ? "Update" : "Create"}
                    </MDButton>
                </DialogActions>
            </Dialog>
        </MDBox>
    );
}
