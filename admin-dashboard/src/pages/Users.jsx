import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

function Users() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox display="flex" alignItems="center" mb={2}>
          <MDTypography variant="h3" fontWeight="medium" mr={2}>
            Users Management
          </MDTypography>
          <MDBadge badgeContent="Coming Soon" color="info" size="sm" />
        </MDBox>
        <MDTypography variant="body2" color="text">
          This page will display all users with search, filter, and management capabilities.
        </MDTypography>
      </MDBox>
    </DashboardLayout>
  );
}

export default Users;
