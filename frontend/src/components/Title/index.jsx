import React from "react";
import Typography from "@mui/material/Typography";
import makeStyles from '@mui/styles/makeStyles';

const useStyles = makeStyles(theme => ({
	title: {
		fontSize: "1.35rem",
		fontWeight: 600,
		color: theme.palette.primary.main,
		marginBottom: 0,
		letterSpacing: "-0.02em",
		[theme.breakpoints.down('sm')]: {
			fontSize: "1.1rem",
		},
	},
}));

export default function Title(props) {
	const classes = useStyles();
	return (
		<Typography
			variant="h5"
			component="h2"
			className={classes.title}
		>
			{props.children}
		</Typography>
	);
}
