import { toast } from "react-toastify";
import { i18n } from "../translate/i18n";

const toastError = err => {
        const data = err?.response?.data;
        const errorMsg =
                (typeof data === "string" && data) ||
                data?.message ||
                data?.error ||
                err?.message ||
                err;
        const message = errorMsg || "An error occurred!";
        const translationKey = `backendErrors.${message}`;
        const toastMessage = i18n.exists(translationKey)
                ? i18n.t(translationKey)
                : message;
        toast.error(toastMessage, { toastId: message });
};

export default toastError;
