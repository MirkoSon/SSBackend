import { useState } from "react";
import Icon from "@mui/material/Icon";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Fab from "@mui/material/Fab";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import MDSnackbar from "components/MDSnackbar";
import MDBadge from "components/MDBadge";

import { useProjects } from "context/projectContext";

const initialFormState = { name: "" };

export default function Projects() {
  const { projects, addProject, deleteProject, selectProject, currentProjectId } = useProjects();

  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, color: "info", title: "", message: "" });

  const generateProjectId = (name) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  const openCreateModal = () => {
    setModalOpen(true);
  };

  const closeCreateModal = () => {
    setModalOpen(false);
    setForm(initialFormState);
  };

  const showToast = (color, title, message) => {
    setToast({
      open: true,
      color,
      title,
      message,
      time: new Date().toLocaleTimeString(),
    });
  };

  const handleCloseToast = () => setToast((current) => ({ ...current, open: false }));

  const handleFormChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      showToast("error", "Validation error", "Project name is required");
      return;
    }

    setSubmitting(true);
    try {
      const projectId = generateProjectId(form.name);
      const projectData = {
        id: projectId,
        name: form.name.trim(),
        database: `db/${projectId}.db`
      };

      await addProject(projectData);
      setForm(initialFormState);
      closeCreateModal();
      showToast("success", "Project created", `Project "${form.name}" was created successfully.`);
    } catch (err) {
      showToast("error", "Create failed", err.message || "Unable to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectProject = (projectId) => {
    selectProject(projectId);
    showToast("info", "Project selected", `Switched to project: ${projects.find(p => p.id === projectId)?.name}`);
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (!confirm(`Are you sure you want to delete project "${projectName}"?`)) {
      return;
    }

    try {
      await deleteProject(projectId);
      showToast("success", "Project deleted", `Project "${projectName}" was deleted.`);
    } catch (err) {
      showToast("error", "Delete failed", err.message || "Unable to delete project");
    }
  };

  return (
    <MDBox p={3}>
      {/* Header */}
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <MDBox>
          <MDTypography variant="h4" fontWeight="medium">
            Projects Management
          </MDTypography>
          <MDTypography variant="body2" color="text">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </MDTypography>
        </MDBox>
        <MDButton variant="gradient" color="primary" onClick={openCreateModal}>
          <Icon sx={{ mr: 1 }}>add</Icon>
          Create Project
        </MDButton>
      </MDBox>

      {/* Project Cards Grid */}
      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid item xs={12} sm={6} md={4} key={project.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <MDBox p={2} flexGrow={1}>
                <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <MDTypography variant="h6" fontWeight="medium">
                    {project.name}
                  </MDTypography>
                  {currentProjectId === project.id && (
                    <MDBadge badgeContent="Active" color="success" size="xs" />
                  )}
                </MDBox>
                <MDTypography variant="caption" color="text" display="block" mb={0.5}>
                  ID: {project.id}
                </MDTypography>
                <MDTypography variant="caption" color="text" display="block">
                  Database: {project.database}
                </MDTypography>
              </MDBox>
              <MDBox p={2} pt={0} display="flex" gap={1}>
                {currentProjectId !== project.id && (
                  <MDButton
                    variant="outlined"
                    color="info"
                    size="small"
                    fullWidth
                    onClick={() => handleSelectProject(project.id)}
                  >
                    Select
                  </MDButton>
                )}
                <MDButton
                  variant="outlined"
                  color="error"
                  size="small"
                  fullWidth
                  onClick={() => handleDeleteProject(project.id, project.name)}
                >
                  Delete
                </MDButton>
              </MDBox>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {projects.length === 0 && (
        <MDBox textAlign="center" py={6}>
          <Icon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}>folder_off</Icon>
          <MDTypography variant="h5" color="text" mb={1}>
            No projects yet
          </MDTypography>
          <MDTypography variant="body2" color="text" mb={3}>
            Create your first project to get started
          </MDTypography>
          <MDButton variant="gradient" color="primary" onClick={openCreateModal}>
            <Icon sx={{ mr: 1 }}>add</Icon>
            Create Project
          </MDButton>
        </MDBox>
      )}

      {/* Create Project Modal */}
      <Dialog open={modalOpen} onClose={closeCreateModal} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <MDBox component="form" id="create-project-form" onSubmit={handleCreateProject} pt={2}>
            <MDInput
              label="Project Name"
              value={form.name}
              required
              fullWidth
              autoFocus
              placeholder="e.g., My Game Project"
              onChange={(e) => handleFormChange("name", e.target.value)}
            />
            <MDBox mt={2}>
              <MDTypography variant="caption" color="text">
                ID and database path will be generated automatically
              </MDTypography>
            </MDBox>
          </MDBox>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={closeCreateModal} color="secondary" disabled={submitting}>
            Cancel
          </MDButton>
          <MDButton
            type="submit"
            form="create-project-form"
            color="primary"
            variant="gradient"
            disabled={submitting}
          >
            <Icon sx={{ fontSize: "1.2rem", mr: 0.75 }}>add</Icon>
            Create Project
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Toast Notifications */}
      <MDSnackbar
        color={toast.color}
        icon={<Icon>{toast.color === "error" ? "error" : "check_circle"}</Icon>}
        title={toast.title || "Status"}
        dateTime={toast.time || ""}
        content={toast.message || ""}
        open={toast.open}
        onClose={handleCloseToast}
        close={handleCloseToast}
        bgWhite={toast.color === "light"}
      />
    </MDBox>
  );
}
