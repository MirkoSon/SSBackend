import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';

// MD components
import MDBox from 'components/MDBox';

// Custom components
import AdminNavbar from 'components/AdminNavbar';
import Sidebar from 'components/Sidebar';

// Context
import { useMaterialUIController } from 'context';

function DashboardLayout() {
    const [controller] = useMaterialUIController();
    const { darkMode, miniSidenav } = controller;

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
            {/* Top Navbar - Fixed at top */}
            <AdminNavbar />

            {/* Left Sidebar - Fixed at left */}
            <Sidebar />

            {/* Main Content Area */}
            <MDBox
                component="main"
                sx={{
                    marginTop: '64px', // Account for navbar height
                    marginLeft: miniSidenav ? '80px' : '280px', // Account for sidebar width
                    transition: 'margin-left 0.3s ease-in-out',
                    minHeight: 'calc(100vh - 64px)',
                    backgroundColor: '#0f172a',
                }}
            >
                {/* Child routes render here */}
                <Outlet />
            </MDBox>
        </Box>
    );
}

export default DashboardLayout;
