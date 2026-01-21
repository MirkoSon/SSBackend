import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';

// MD components
import MDBox from 'components/MDBox';

// Custom components
import Sidebar from 'components/Sidebar';

// Context
import { useMaterialUIController } from 'context';

function DashboardLayout() {
    const [controller] = useMaterialUIController();
    const { darkMode, miniSidenav } = controller;

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: darkMode ? '#0f172a' : '#f8fafc' }}>

            {/* Left Sidebar - Fixed at left */}
            <Sidebar />

            {/* Main Content Area */}
            <MDBox
                component="main"
                sx={{
                    marginLeft: miniSidenav ? '80px' : '280px', // Account for sidebar width
                    transition: 'margin-left 0.3s ease-in-out',
                    minHeight: '100vh',
                    backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
                    p: 3,
                }}
            >
                {/* Child routes render here */}
                <Outlet />
            </MDBox>
        </Box>
    );
}

export default DashboardLayout;
