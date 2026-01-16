import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Icon from "@mui/material/Icon";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import MDSnackbar from "components/MDSnackbar";

import { useProjects } from "context/projectContext";

const initialFormState = { name: "" };

export default function Projects({ createProjectRef }) {
  const { addProject } = useProjects();

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

  // Expose openCreateModal to parent via ref
  useEffect(() => {
    if (createProjectRef) {
      createProjectRef.current = openCreateModal;
    }
  }, [createProjectRef]);

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

  return (
    <>
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
    </>
  );
}

Projects.propTypes = {
  createProjectRef: PropTypes.shape({
    current: PropTypes.func,
  }),
};

Projects.defaultProps = {
  createProjectRef: null,
};
