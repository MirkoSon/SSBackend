import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

function Export() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox display="flex" alignItems="center" mb={2}>
          <MDTypography variant="h3" fontWeight="medium" mr={2}>
            Data Export
          </MDTypography>
          <MDBadge badgeContent="Coming Soon" color="info" size="sm" />
        </MDBox>
        <MDTypography variant="body2" color="text">
          This page will allow exporting users, saves, and progress data to CSV/JSON formats.
        </MDTypography>
      </MDBox>
    </DashboardLayout>
  );
}

export default Export;
