/**
 * Project Context Middleware
 * 
 * Injects project context into Express requests based on URL path.
 * Supports both project-scoped routes (/api/project/:projectId/*)
 * and backward-compatible default project routes (/api/*).
 * 
 * Epic 7 - Multi-Project Support
 * Story 7.2.1 - Project Context Middleware
 */

/**
 * Creates project context middleware
 * @param {ProjectManager} projectManager - ProjectManager instance
 * @returns {Function} Express middleware function
 */
function createProjectMiddleware(projectManager) {
    return async (req, res, next) => {
        // Extract project ID from URL params or use default
        let projectId = req.params.projectId;

        // Fallback to default project if no projectId in URL
        if (!projectId) {
            const config = req.app.get('config');
            projectId = config.server?.default_project || 'default';

            // Log backward compatibility usage
            if (process.env.NODE_ENV !== 'production') {
                console.log(`🔄 Using default project for route: ${req.method} ${req.path}`);
            }
        }

        // Get project context
        const project = projectManager.getProject(projectId);

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
                projectId,
                timestamp: new Date().toISOString()
            });
        }

        // Update last accessed timestamp
        project.touch();

        // Inject project context into request
        req.project = project;
        req.projectId = projectId;
        req.db = project.database;
        req.pluginManager = project.pluginManager;

        next();
    };
}

module.exports = createProjectMiddleware;
