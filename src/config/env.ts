const API_ORIGIN = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:1145";
export const API_BASE_URL = (API_ORIGIN.endsWith("/") ? API_ORIGIN.slice(0, -1) : API_ORIGIN) + "/api/v1";
export const API_URL_TWO = (API_ORIGIN.endsWith("/") ? API_ORIGIN.slice(0, -1) : API_ORIGIN);
export const IS_PROD = import.meta.env.PROD;