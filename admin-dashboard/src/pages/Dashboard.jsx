import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDTypography variant="h3" fontWeight="medium" mb={2}>
          Welcome to SS Backend Admin
        </MDTypography>
        <MDTypography variant="body2" color="text">
          Select a view from the sidebar to get started.
        </MDTypography>
      </MDBox>
    </DashboardLayout>
  );
}

export default Dashboard;
