import { useState, useEffect, useReducer } from "react";
import axios from "axios";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";

import api from "../../services/api";

const reducer = (state, action) => {
	if (action.type === "LOAD_WHATSAPPS") {
		const whatsApps = action.payload;
		if (!whatsApps) return state;
		return [...whatsApps];
	}

	if (action.type === "UPDATE_WHATSAPPS") {
		const whatsApp = action.payload;
		if (!whatsApp || !whatsApp.id) {
			return state;
		}
		const whatsAppIndex = state.findIndex(s => s && s.id === whatsApp.id);

		if (whatsAppIndex !== -1) {
			return state.map((item, idx) => idx === whatsAppIndex ? whatsApp : item);
		} else {
			return [whatsApp, ...state];
		}
	}

	if (action.type === "UPDATE_SESSION") {
		const whatsApp = action.payload;
		if (!whatsApp || !whatsApp.id) {
			return state;
		}
		const whatsAppIndex = state.findIndex(s => s && s.id === whatsApp.id);

		if (whatsAppIndex !== -1) {
			return state.map((item, idx) =>
				idx === whatsAppIndex
					? { ...item, status: whatsApp.status, updatedAt: whatsApp.updatedAt, qrcode: whatsApp.qrcode, retries: whatsApp.retries }
					: item
			);
		} else {
			return [...state];
		}
	}

	if (action.type === "DELETE_WHATSAPPS") {
		const whatsAppId = action.payload;
		if (!whatsAppId) {
			return state;
		}

		return state.filter(s => s && s.id !== whatsAppId);
	}

	if (action.type === "RESET") {
		return [];
	}
	
	return state;
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

                if (!socket) return undefined;

                socket.on("whatsapp", data => {
                        if (!isMounted || !data) return;
                        if (data.action === "update" && data.whatsapp) {
                                dispatch({
                                        type: "UPDATE_WHATSAPPS",
                                        payload: data.whatsapp,
                                });
                        }
                        if (data.action === "delete" && data.whatsappId) {
                                dispatch({ type: "DELETE_WHATSAPPS", payload: data.whatsappId });
                        }
                });

                socket.on("whatsappSession", data => {
                        if (!isMounted) return;
                        if (!data) {
                                return;
                        }
                        if (data.action === "update" && data.session) {
                                dispatch({ type: "UPDATE_SESSION", payload: data.session });
                        }
                });

                return () => {
                        isMounted = false;
                        socket.off("whatsapp");
                        socket.off("whatsappSession");
                };
        }, []);

	return { whatsApps, loading };
};

export default useWhatsApps;
