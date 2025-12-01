import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import Chip from "@material-ui/core/Chip";
import ListItemText from "@material-ui/core/ListItemText";
import Checkbox from "@material-ui/core/Checkbox";
import CircularProgress from "@material-ui/core/CircularProgress";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
	chips: {
		display: "flex",
		flexWrap: "wrap",
	},
	chip: {
		margin: 2,
		color: "#fff",
		fontWeight: 500,
	},
	menuItem: {
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1),
	},
	queueColor: {
		width: 20,
		height: 20,
		borderRadius: "50%",
		marginRight: theme.spacing(1),
	},
	queueInfo: {
		display: "flex",
		flexDirection: "column",
		marginLeft: theme.spacing(1),
	},
	queueStats: {
		fontSize: "0.75rem",
		color: theme.palette.text.secondary,
	},
}));

const QueueSelect = ({ selectedQueueIds, onChange }) => {
	const classes = useStyles();
	const [queues, setQueues] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			setLoading(true);
			try {
				const { data } = await api.get("/queue");
				setQueues(data);
			} catch (err) {
				toastError(err);
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const handleChange = e => {
		onChange(e.target.value);
	};

	return (
		<div style={{ marginTop: 6 }}>
			<FormControl fullWidth margin="dense" variant="outlined">
				<InputLabel>{i18n.t("queueSelect.inputLabel")}</InputLabel>
				<Select
					multiple
					labelWidth={60}
					value={selectedQueueIds}
					onChange={handleChange}
					disabled={loading}
					MenuProps={{
						anchorOrigin: {
							vertical: "bottom",
							horizontal: "left",
						},
						transformOrigin: {
							vertical: "top",
							horizontal: "left",
						},
						getContentAnchorEl: null,
					}}
					renderValue={selected => (
						<div className={classes.chips}>
							{selected?.length > 0 &&
								selected.map(id => {
									const queue = queues.find(q => q.id === id);
									return queue ? (
										<Chip
											key={id}
											style={{ 
												backgroundColor: queue.color,
												color: "#fff"
											}}
											variant="outlined"
											label={queue.name}
											className={classes.chip}
										/>
									) : null;
								})}
						</div>
					)}
				>
					{loading ? (
						<MenuItem disabled>
							<CircularProgress size={20} />
							<span style={{ marginLeft: 10 }}>Cargando...</span>
						</MenuItem>
					) : queues.length === 0 ? (
						<MenuItem disabled>
							<Typography variant="body2" color="textSecondary">
								No hay colas disponibles
							</Typography>
						</MenuItem>
					) : (
						queues.map(queue => (
							<MenuItem key={queue.id} value={queue.id}>
								<Checkbox 
									checked={selectedQueueIds?.indexOf(queue.id) > -1}
									color="primary"
								/>
								<Box 
									className={classes.queueColor}
									style={{ backgroundColor: queue.color }}
								/>
								<Box className={classes.queueInfo}>
									<ListItemText 
										primary={queue.name}
										secondary={
											<span className={classes.queueStats}>
												{queue.users?.length || 0} usuarios • {queue.whatsapps?.length || 0} conexiones
											</span>
										}
									/>
								</Box>
							</MenuItem>
						))
					)}
				</Select>
			</FormControl>
		</div>
	);
};

export default QueueSelect;
