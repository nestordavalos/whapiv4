import { useState, useEffect, useReducer } from "react";
import axios from "axios";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";

import api from "../../services/api";

const reducer = (state, action) => {
	if (action.type === "LOAD_WHATSAPPS") {
		const whatsApps = action.payload;

		return [...whatsApps];
	}

	if (action.type === "UPDATE_WHATSAPPS") {
		const whatsApp = action.payload;
		const whatsAppIndex = state.findIndex(s => s.id === whatsApp.id);

		if (whatsAppIndex !== -1) {
			state[whatsAppIndex] = whatsApp;
			return [...state];
		} else {
			return [whatsApp, ...state];
		}
	}

	if (action.type === "UPDATE_SESSION") {
		const whatsApp = action.payload;
		const whatsAppIndex = state.findIndex(s => s.id === whatsApp.id);

		if (whatsAppIndex !== -1) {
			state[whatsAppIndex].status = whatsApp.status;
			state[whatsAppIndex].updatedAt = whatsApp.updatedAt;
			state[whatsAppIndex].qrcode = whatsApp.qrcode;
			state[whatsAppIndex].retries = whatsApp.retries;
			return [...state];
		} else {
			return [...state];
		}
	}

	if (action.type === "DELETE_WHATSAPPS") {
		const whatsAppId = action.payload;

		const whatsAppIndex = state.findIndex(s => s.id === whatsAppId);
		if (whatsAppIndex !== -1) {
			state.splice(whatsAppIndex, 1);
		}
		return [...state];
	}

	if (action.type === "RESET") {
		return [];
	}
};

const useWhatsApps = () => {
	const [whatsApps, dispatch] = useReducer(reducer, []);
	const [loading, setLoading] = useState(true);

        useEffect(() => {
                let isMounted = true;
                const source = axios.CancelToken.source();
                setLoading(true);
                const fetchSession = async () => {
                        try {
                                const { data } = await api.get("/whatsapp/", {
                                        cancelToken: source.token,
                                });
                                if (isMounted) {
                                        dispatch({ type: "LOAD_WHATSAPPS", payload: data });
                                        setLoading(false);
                                }
                        } catch (err) {
                                if (!axios.isCancel(err) && isMounted) {
                                        setLoading(false);
                                        toastError(err);
                                }
                        }
                };
                fetchSession();
                return () => {
                        isMounted = false;
                        source.cancel();
                };
        }, []);

        useEffect(() => {
                let isMounted = true;
                const socket = openSocket();

                socket.on("whatsapp", data => {
                        if (isMounted && data.action === "update") {
                                dispatch({
                                        type: "UPDATE_WHATSAPPS",
                                        payload: data.whatsapp,
                                });
                        }
                });

                socket.on("whatsapp", data => {
                        if (isMounted && data.action === "delete") {
                                dispatch({ type: "DELETE_WHATSAPPS", payload: data.whatsappId });
                        }
                });

                socket.on("whatsappSession", data => {
                        if (isMounted && data.action === "update") {
                                dispatch({ type: "UPDATE_SESSION", payload: data.session });
                        }
                });

                return () => {
                        isMounted = false;
                        socket.disconnect();
                };
        }, []);

	return { whatsApps, loading };
};

export default useWhatsApps;
