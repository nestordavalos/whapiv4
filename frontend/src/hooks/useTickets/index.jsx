import { useState, useEffect } from "react";
// import { getHoursCloseTicketsAuto } from "../../config";
import toastError from "../../errors/toastError";

import api from "../../services/api";

const useTickets = ({
    searchParam,
    pageNumber,
    status,
    date,
    showAll,
    queueIds,
    tags,
    whatsappIds,
    userIds,
    userId,
    withUnreadMessages,
}) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [count, setCount] = useState(0);

    useEffect(() => {
        setLoading(true);
        const delayDebounceFn = setTimeout(() => {
            const fetchTickets = async() => {
                try {
                    // Construir params solo con valores definidos
                    const params = {
                        searchParam,
                        pageNumber,
                        status,
                        date,
                        showAll,
                        queueIds,
                        userId,
                        withUnreadMessages,
                    };

                // Solo agregar si tienen valores
                if (tags) params.tags = tags;
                if (whatsappIds) params.whatsappIds = whatsappIds;
                if (userIds) params.userIds = userIds;

                const { data } = await api.get("/tickets", { params });

                setTickets(data.tickets)                    // let horasFecharAutomaticamente = getHoursCloseTicketsAuto(); 

                    // if (status === "open" && horasFecharAutomaticamente && horasFecharAutomaticamente !== "" &&
                    //     horasFecharAutomaticamente !== "0" && Number(horasFecharAutomaticamente) > 0) {

                    //     let dataLimite = new Date()
                    //     dataLimite.setHours(dataLimite.getHours() - Number(horasFecharAutomaticamente))

                    //     data.tickets.forEach(ticket => {
                    //         if (ticket.status !== "closed") {
                    //             let dataUltimaInteracaoChamado = new Date(ticket.updatedAt)
                    //             if (dataUltimaInteracaoChamado < dataLimite)
                    //                 closeTicket(ticket)
                    //         }
                    //     })
                    // }

                    setHasMore(data.hasMore)
                    setCount(data.count)
                    setLoading(false)
                } catch (err) {
                    console.error('[useTickets] Error fetching tickets:', {
                        error: err.message,
                        status,
                        pageNumber,
                        timestamp: new Date().toISOString()
                    });
                    setLoading(false)
                    toastError(err)
                }
            }

            // const closeTicket = async(ticket) => {
            //     await api.put(`/tickets/${ticket.id}`, {
            //         status: "closed",
            //         userId: ticket.userId || null,
            //     })
            // }

            fetchTickets()
        }, 500)
        return () => clearTimeout(delayDebounceFn)
    }, [
        searchParam,
        pageNumber,
        status,
        date,
        showAll,
        queueIds,
        tags,
        whatsappIds,
        userIds,
        userId,
        withUnreadMessages,
    ])

    return { tickets, loading, hasMore, count };
};

export default useTickets;