import axios from 'axios'

export const API_URL = 'http://192.168.100.10:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.data);
      console.error('Status Code:', error.response.status);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export interface CreatePostData {
  userId: string;
  title: string;
  description: string;
  category: string;
  backgroundColor?: string;
  mediaUrls?: string[];
}

export const postAPI = {
  createPost: (formData: FormData) =>
    axios.post(`${API_URL}/posts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }),
};

export interface RegisterData {
  fullName: string;
  age: number;
  email: string;
  password: string;
  gender: string;
  userType: 'user' | 'doctor';
}

export interface RegisterDoctorData {
  fullName: string;
  email: string;
  password: string;
  licenseNumber: string;
  specialization: string;
  certificates?: string[];
}

export interface LoginData {
  email: string;
  password: string;
  userType: 'user' | 'doctor';
}

export interface HealthProfileData {
  sleepDuration: number;
  stressLevel: string;
  dietPreference: string;
  additionalNotes?: string;
}

export interface EmergencyContactData {
  fullName: string;
  phoneNumber: string;
  relationship: string;
}

export interface SendMessageData {
  userId: string;
  message: string;
  imageUrl?: string;
  fileUrl?: string;
}

// User API endpoints
export const userAPI = {
  register: (data: RegisterData) =>
    apiClient.post('/users/register', data),

  login: (data: LoginData) =>
    apiClient.post('/users/login', data),

  createHealthProfile: (userId: string, data: HealthProfileData) =>
    apiClient.post(`/users/${userId}/health-profile`, data),

  createEmergencyContacts: (userId: string, data: EmergencyContactData[]) =>
    apiClient.post(`/users/${userId}/emergency-contacts`, { contacts: data }),

  getUser: (userId: string) =>
    apiClient.get(`/users/${userId}`),

  updateUser: (userId: string, data: any) =>
    apiClient.put(`/users/${userId}`, data),

  deleteUser: (userId: string) =>
    apiClient.delete(`/users/${userId}`),
};

// Doctor API endpoints
export const doctorAPI = {
  register: (data: FormData) =>
    axios.post(`${API_URL}/doctors/register`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }),

  login: (data: LoginData) =>
    apiClient.post('/doctors/login', data),

  getDoctor: (doctorId: string) =>
    apiClient.get(`/doctors/${doctorId}`),

  updateDoctor: (doctorId: string, data: any) =>
    apiClient.put(`/doctors/${doctorId}`, data),

  getVerificationStatus: (doctorId: string) =>
    apiClient.get(`/doctors/${doctorId}/verification-status`),
};

// Chatbot API endpoints
export const chatbotAPI = {
  sendMessage: (data: SendMessageData) =>
    apiClient.post('/chatbot/message', data),

  getChatHistory: (userId: string, page = 1, limit = 50) =>
    apiClient.get(`/chatbot/history/${userId}?page=${page}&limit=${limit}`),

  clearHistory: (userId: string) =>
    apiClient.delete(`/chatbot/history/${userId}`),

  getStats: (userId: string) =>
    apiClient.get(`/chatbot/stats/${userId}`),
};

export default apiClient;