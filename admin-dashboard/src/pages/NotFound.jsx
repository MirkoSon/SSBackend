import { useNavigate } from 'react-router-dom';
import MDBox from 'components/MDBox';
import MDTypography from 'components/MDTypography';
import MDButton from 'components/MDButton';

function NotFound() {
    const navigate = useNavigate();

    return (
        <MDBox
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="60vh"
            textAlign="center"
            p={3}
        >
            <MDTypography variant="h1" fontWeight="bold" color="error" mb={2}>
                404
            </MDTypography>
            <MDTypography variant="h4" fontWeight="medium" mb={1}>
                Page Not Found
            </MDTypography>
            <MDTypography variant="body2" color="text" mb={4}>
                The page you're looking for doesn't exist or has been moved.
            </MDTypography>
            <MDButton variant="gradient" color="info" onClick={() => navigate('/')}>
                Go to Dashboard
            </MDButton>
        </MDBox>
    );
}

export default NotFound;
