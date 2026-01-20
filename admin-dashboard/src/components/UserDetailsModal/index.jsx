import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Icon from '@mui/material/Icon';
import Divider from '@mui/material/Divider';

import MDBox from 'components/MDBox';
import MDTypography from 'components/MDTypography';

/**
 * Detail Row Component
 * Displays a label-value pair
 */
function DetailRow({ label, value }) {
    return (
        <MDBox display="flex" py={1.5}>
            <MDTypography variant="button" fontWeight="bold" sx={{ width: '40%' }}>
                {label}:
            </MDTypography>
            <MDTypography variant="button" color="text" sx={{ width: '60%' }}>
                {value}
            </MDTypography>
        </MDBox>
    );
}

DetailRow.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

/**
 * User Details Modal Component
 * Displays detailed information about a user
 */
function UserDetailsModal({ open, user, onClose }) {
    if (!user) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <MDBox display="flex" justifyContent="space-between" alignItems="center">
                    <MDTypography variant="h5" fontWeight="medium">
                        User Details
                    </MDTypography>
                    <IconButton onClick={onClose} size="small">
                        <Icon>close</Icon>
                    </IconButton>
                </MDBox>
            </DialogTitle>
            <DialogContent>
                <MDBox>
                    <DetailRow label="ID" value={user.id} />
                    <Divider />
                    <DetailRow label="Username" value={user.username} />
                    <Divider />
                    <DetailRow label="Created" value={formatDate(user.created_at)} />
                    <Divider />
                    <DetailRow label="Last Login" value={formatDate(user.last_login)} />
                    <Divider />
                    <DetailRow label="Login Count" value={user.login_count || 0} />
                </MDBox>
            </DialogContent>
        </Dialog>
    );
}

UserDetailsModal.propTypes = {
    open: PropTypes.bool.isRequired,
    user: PropTypes.shape({
        id: PropTypes.number,
        username: PropTypes.string,
        created_at: PropTypes.string,
        last_login: PropTypes.string,
        login_count: PropTypes.number,
    }),
    onClose: PropTypes.func.isRequired,
};

UserDetailsModal.defaultProps = {
    user: null,
};

export default UserDetailsModal;
