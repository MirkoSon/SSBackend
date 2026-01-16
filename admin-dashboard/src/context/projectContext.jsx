import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { createProject, deleteProject, getProjects } from "services/api/projectService";

const ProjectContext = createContext();

const STORAGE_KEY = "ssbackend.currentProjectId";

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(
    () => localStorage.getItem(STORAGE_KEY) || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProjects();
      setProjects(Array.isArray(data) ? data : []);

      if (currentProjectId && !data.find((project) => project.id === currentProjectId)) {
        setCurrentProjectId(null);
        localStorage.removeItem(STORAGE_KEY);
      }

      setError(null);
    } catch (err) {
      setError(err.message || "Unable to load projects");
    } finally {
      setLoading(false);
    }
  }, [currentProjectId]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem(STORAGE_KEY, currentProjectId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentProjectId]);

  const selectProject = useCallback((projectId) => {
    setCurrentProjectId(projectId);
  }, []);

  const addProject = useCallback(
    async (project) => {
      const created = await createProject(project);
      await refreshProjects();
      if (created?.id) {
        setCurrentProjectId(created.id);
      }
      return created;
    },
    [refreshProjects]
  );

  const removeProject = useCallback(
    async (projectId) => {
      await deleteProject(projectId);
      await refreshProjects();
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }
    },
    [currentProjectId, refreshProjects]
  );

  const value = useMemo(
    () => ({
      projects,
      currentProjectId,
      loading,
      error,
      refreshProjects,
      selectProject,
      addProject,
      removeProject,
    }),
    [projects, currentProjectId, loading, error, refreshProjects, selectProject, addProject, removeProject]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

ProjectProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useProjects() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }

  return context;
}
