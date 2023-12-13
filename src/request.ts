import Axios from "axios";
import axiosRetry from "axios-retry";
import { throwNewError } from "./utils";

interface AxiosConfig {
  timeout: number;
  withCredentials: boolean;
  retries: number;
  shouldResetTimeout: boolean;
  retryDelay: number;
}

const axiosConfig: AxiosConfig = {
  timeout: 10000,
  withCredentials: true,
  retries: 3,
  shouldResetTimeout: true,
  retryDelay: 100,
};

const axiosService = Axios.create({
  timeout: axiosConfig.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosRetry(axiosService, {
  retries: axiosConfig.retries,
  shouldResetTimeout: axiosConfig.shouldResetTimeout,
  retryDelay: (retryCount) => retryCount * axiosConfig.retryDelay,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.message.includes("timeout")
    );
  },
});

axiosService.interceptors.request.use(
  (config: any) => {
    config.headers = {
      ...config.headers,
    };
    return config;
  },
  (error) => errorHandler(error)
);

axiosService.interceptors.response.use(
  (response: any) => {
    if (!response) return;
    return response;
  },
  (error) => errorHandler(error)
);

const errorHandler = (error: any) => {
  return throwNewError(error.message);
};

export default axiosService;
