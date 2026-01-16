const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson && payload?.message ? payload.message : response.statusText;
    throw new Error(message || "Request failed");
  }

  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.projects)) {
      return payload.projects;
    }
    if (payload.project) {
      return payload.project;
    }
  }

  return payload;
}

export async function getProjects() {
  const response = await fetch(`${API_BASE_URL}/admin/api/projects`, {
    credentials: "include",
    headers: {
      "x-admin-bypass": "true",
    },
  });
  return handleResponse(response);
}

export async function createProject(project) {
  const response = await fetch(`${API_BASE_URL}/admin/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-bypass": "true",
    },
    credentials: "include",
    body: JSON.stringify(project),
  });

  return handleResponse(response);
}

export async function deleteProject(projectId) {
  const response = await fetch(`${API_BASE_URL}/admin/api/projects/${projectId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "x-admin-bypass": "true",
    },
  });

  if (response.status === 204) {
    return;
  }

  return handleResponse(response);
}
