import React, { useEffect } from "react";
import openSocket from "../../services/socket-io";
import makeStyles from '@mui/styles/makeStyles';
import { getBackendUrl } from "../../config";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		alignItems: "center",
		padding: theme.spacing(1)
	},

	paper: {
		padding: theme.spacing(2),
		display: "flex",
		alignItems: "center",
	},

	settingOption: {
		marginLeft: "auto",
	},
	margin: {
		margin: theme.spacing(1),
	},
}));


const ApiDocs = () => {
	const classes = useStyles();

        useEffect(() => {
                const socket = openSocket();
                return () => {
                        if (socket) socket.off();
                };
        }, []);

    const back = getBackendUrl();
    const endapi = "/api-docs";
    const urlapi = back ? back.concat(endapi) : endapi;

    return (
        
		<div className={classes.root}> 
		<iframe title="Doc da API" src={urlapi} height='800' width='100%' frameBorder="0"/>  
		</div>
	);
};

export default ApiDocs;
