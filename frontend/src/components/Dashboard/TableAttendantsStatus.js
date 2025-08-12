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
    }
}));

export function RatingBox ({ rating }) {
    const ratingTrunc = rating === null ? 0 : Math.trunc(rating);
    return <Rating
        defaultValue={ratingTrunc}
        max={10}
        readOnly
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
                    <RatingBox rating={a.rating} />
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
        width="100%"
        >
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell align="center">Evaluaciones</TableCell>
                    <TableCell align="center">Total de Evaluaciones</TableCell>
                    <TableCell align="center">T.M. de Atendimento</TableCell>
                    <TableCell align="center">Nº de Atendimentos</TableCell>
                    <TableCell align="center">Estado (Atual)</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
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
    </TableContainer> : <Skeleton variant="rectangular" height={150} />);
}