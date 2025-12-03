import React from "react";

import Paper from "@mui/material/Paper";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';

import makeStyles from '@mui/styles/makeStyles';
import { green, red } from '@mui/material/colors';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import moment from 'moment';

import Rating from '@mui/material/Rating';

const useStyles = makeStyles(theme => ({
	on: {
		color: green[600],
		fontSize: '20px'
	},
	off: {
		color: red[600],
		fontSize: '20px'
	},
	pointer: {
		cursor: "pointer"
	},
	tableContainer: {
		backgroundColor: theme.palette.background.paper,
		borderRadius: 12,
		boxShadow: theme.palette.mode === "dark" 
			? "0 2px 8px rgba(0,0,0,0.3)" 
			: "0 2px 8px rgba(0,0,0,0.06)",
		border: theme.palette.mode === "dark" ? `1px solid ${theme.palette.divider}` : "none",
		overflow: "hidden",
	},
	tableHead: {
		backgroundColor: theme.palette.mode === "dark" 
			? "rgba(0, 113, 193, 0.1)" 
			: "rgba(0, 113, 193, 0.05)",
		"& .MuiTableCell-head": {
			color: theme.palette.text.primary,
			fontWeight: 600,
			borderBottom: `1px solid ${theme.palette.divider}`,
			whiteSpace: "nowrap",
		},
	},
	tableBody: {
		"& .MuiTableCell-body": {
			color: theme.palette.text.primary,
			borderBottom: `1px solid ${theme.palette.divider}`,
		},
		"& .MuiTableRow-root:hover": {
			backgroundColor: theme.palette.mode === "dark" 
				? "rgba(255, 255, 255, 0.05)" 
				: "rgba(0, 0, 0, 0.02)",
		},
		"& .MuiTableRow-root:last-child .MuiTableCell-body": {
			borderBottom: "none",
		},
	},
	rating: {
		"& .MuiRating-iconFilled": {
			color: "#ffb822",
		},
		"& .MuiRating-iconEmpty": {
			color: theme.palette.mode === "dark" 
				? "rgba(255, 255, 255, 0.2)" 
				: "rgba(0, 0, 0, 0.2)",
		},
	},
	skeleton: {
		borderRadius: 12,
		backgroundColor: theme.palette.mode === "dark" 
			? "rgba(255, 255, 255, 0.1)" 
			: "rgba(0, 0, 0, 0.1)",
	},
}));

export function RatingBox ({ rating, className }) {
    const ratingTrunc = rating === null ? 0 : Math.trunc(rating);
    return <Rating
        defaultValue={ratingTrunc}
        max={10}
        readOnly
        className={className}
    />
}

export default function TableAttendantsStatus(props) {
    const { loading, attendants } = props
	const classes = useStyles();

    function renderList () {
        return attendants.map((a, k) => (
            <TableRow key={k}>
                <TableCell>{a.name}</TableCell>
                <TableCell align="center" title={a.rating} className={classes.pointer}>
                    <RatingBox rating={a.rating} className={classes.rating} />
                </TableCell>
                <TableCell align="center">{a.countRating}</TableCell>
                <TableCell align="center">{formatTime(a.avgSupportTime, 2)}</TableCell>
                <TableCell align="center">{a.tickets}</TableCell>
                <TableCell align="center">
                    { a.online ?
                        <CheckCircleIcon className={classes.on} />
                        : <ErrorIcon className={classes.off} />
                    }
                </TableCell>
            </TableRow>
        ))
    }

	function formatTime(minutes){
		return moment().startOf('day').add(minutes, 'minutes').format('HH[h] mm[m]');
	}

    return (!loading ? <TableContainer 
        component={Paper}
        className={classes.tableContainer}
        elevation={0}
        >
        <Table>
            <TableHead className={classes.tableHead}>
                <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell align="center">Evaluaciones</TableCell>
                    <TableCell align="center">Total de Evaluaciones</TableCell>
                    <TableCell align="center">T.M. de Atendimento</TableCell>
                    <TableCell align="center">Nº de Atendimentos</TableCell>
                    <TableCell align="center">Estado (Atual)</TableCell>
                </TableRow>
            </TableHead>
            <TableBody className={classes.tableBody}>
                { renderList() }
                {/* <TableRow>
                    <TableCell>Nome 4</TableCell>
                    <TableCell align="center">10</TableCell>
                    <TableCell align="center">10 minutos</TableCell>
                    <TableCell align="center">
                        <CheckCircleIcon className={classes.off} />
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Nome 5</TableCell>
                    <TableCell align="center">10</TableCell>
                    <TableCell align="center">10 minutos</TableCell>
                    <TableCell align="center">
                        <CheckCircleIcon className={classes.on} />
                    </TableCell>
                </TableRow> */}
            </TableBody>
        </Table>
    </TableContainer> : <Skeleton variant="rectangular" height={150} className={classes.skeleton} />);
}