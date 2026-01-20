import PropTypes from 'prop-types';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import Paper from '@mui/material/Paper';

import MDBox from 'components/MDBox';
import MDTypography from 'components/MDTypography';

/**
 * Reusable DataTable Component
 * Displays tabular data with loading and empty states
 */
function DataTable({ table, loading, emptyMessage = 'No data available' }) {
    const { columns, rows } = table;

    // Loading state - show skeleton rows
    if (loading) {
        return (
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {columns.map((col) => (
                                <TableCell key={col.accessor} width={col.width}>
                                    <MDTypography variant="caption" fontWeight="bold" textTransform="uppercase">
                                        {col.Header}
                                    </MDTypography>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                {columns.map((col) => (
                                    <TableCell key={col.accessor}>
                                        <Skeleton variant="text" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    // Empty state
    if (!rows || rows.length === 0) {
        return (
            <MDBox p={3} textAlign="center">
                <MDTypography variant="body2" color="text">
                    {emptyMessage}
                </MDTypography>
            </MDBox>
        );
    }

    // Data table
    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        {columns.map((col) => (
                            <TableCell key={col.accessor} width={col.width}>
                                <MDTypography variant="caption" fontWeight="bold" textTransform="uppercase">
                                    {col.Header}
                                </MDTypography>
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex} hover>
                            {columns.map((col) => (
                                <TableCell key={col.accessor}>
                                    {col.Cell ? (
                                        <col.Cell row={{ original: row }} />
                                    ) : (
                                        <MDTypography variant="button" fontWeight="regular">
                                            {row[col.accessor] || '-'}
                                        </MDTypography>
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

DataTable.propTypes = {
    table: PropTypes.shape({
        columns: PropTypes.arrayOf(
            PropTypes.shape({
                Header: PropTypes.string.isRequired,
                accessor: PropTypes.string.isRequired,
                width: PropTypes.string,
                Cell: PropTypes.func,
            })
        ).isRequired,
        rows: PropTypes.array.isRequired,
    }).isRequired,
    loading: PropTypes.bool,
    emptyMessage: PropTypes.string,
};

DataTable.defaultProps = {
    loading: false,
    emptyMessage: 'No data available',
};

export default DataTable;
