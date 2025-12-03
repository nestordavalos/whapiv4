import React from "react";

import { Avatar, Card, CardHeader, Typography } from "@mui/material";
import Skeleton from '@mui/material/Skeleton';

import makeStyles from '@mui/styles/makeStyles';

const useStyles = makeStyles(theme => ({
	card: {
		backgroundColor: theme.palette.background.paper,
		borderRadius: 12,
		boxShadow: theme.palette.mode === "dark" 
			? "0 2px 8px rgba(0,0,0,0.3)" 
			: "0 2px 8px rgba(0,0,0,0.06)",
		border: theme.palette.mode === "dark" ? `1px solid ${theme.palette.divider}` : "none",
	},
	cardAvatar: {
		fontSize: '55px',
		color: theme.palette.primary.main,
		backgroundColor: theme.palette.mode === "dark" 
			? "rgba(0, 113, 193, 0.15)" 
			: "rgba(0, 113, 193, 0.1)",
		width: theme.spacing(7),
		height: theme.spacing(7),
		borderRadius: 12,
	},
	cardTitle: {
		fontSize: '18px',
		color: theme.palette.text.primary,
		fontWeight: 600,
	},
	cardSubtitle: {
		color: theme.palette.text.secondary,
		fontSize: '14px',
	},
	skeleton: {
		borderRadius: 12,
		backgroundColor: theme.palette.mode === "dark" 
			? "rgba(255, 255, 255, 0.1)" 
			: "rgba(0, 0, 0, 0.1)",
	},
}));

export default function CardCounter(props) {
    const { icon, title, value, loading } = props
	const classes = useStyles();
    return (!loading ? <Card className={classes.card} elevation={0}>
        <CardHeader
            avatar={
                <Avatar className={classes.cardAvatar}>
                    {icon}
                </Avatar>
            }
            title={
                <Typography variant="h6" component="h2" className={classes.cardTitle}>
                    { title }
                </Typography>
            }
            subheader={
                <Typography variant="subtitle1" component="p" className={classes.cardSubtitle}>
                    { value }
                </Typography>
            }
        />
    </Card> : <Skeleton variant="rectangular" height={80} className={classes.skeleton} />);
    
}