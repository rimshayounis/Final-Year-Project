import axios from 'axios'
export const API_URL = 'http://10.161.203.86:3000/api';
// ── Base socket URL (no /api suffix) ──────────────────────────────────────────
export const SOCKET_URL = 'http://10.161.203.86:3000';


const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status !== 404) {
      console.error('API Error:', error.response?.data);
      console.error('Status Code:', error.response?.status);
    }
    return Promise.reject(error);
  }
);

export interface BookAppointmentData {
  userId: string;
  doctorId: string;
  date: string;
  time: string;
  sessionDuration: number;
  consultationFee: number;
  healthConcern: string;
}

export interface UpdateAppointmentStatusData {
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  cancelReason?: string;
}

export const bookedAppointmentAPI = {
  book: (data: BookAppointmentData) =>
    apiClient.post('/booked-appointments', data),

  getUserAppointments: (userId: string) =>
    apiClient.get(`/booked-appointments/user/${userId}`),

  getUserUpcoming: (userId: string) =>
    apiClient.get(`/booked-appointments/user/${userId}/upcoming`),

  getDoctorAppointments: (doctorId: string) =>
    apiClient.get(`/booked-appointments/doctor/${doctorId}`),

  getDoctorUpcoming: (doctorId: string) =>
    apiClient.get(`/booked-appointments/doctor/${doctorId}/upcoming`),

  getById: (appointmentId: string) =>
    apiClient.get(`/booked-appointments/${appointmentId}`),

  updateStatus: (appointmentId: string, data: UpdateAppointmentStatusData) =>
    apiClient.patch(`/booked-appointments/${appointmentId}/status`, data),

  cancel: (appointmentId: string, cancelReason?: string) =>
    apiClient.delete(`/booked-appointments/${appointmentId}/cancel`, {
      data: { cancelReason },
    }),
};

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

export interface TimeSlot {
  start: string;
  end: string;
}

export interface SpecificDate {
  date: string;
  timeSlots: TimeSlot[];
}

export interface CreateAvailabilityData {
  doctorId: string;
  sessionDuration: number;
  consultationFee: number;
  specificDates: SpecificDate[];
}

export interface UpdateAvailabilityData {
  sessionDuration?: number;
  consultationFee?: number;
  specificDates?: SpecificDate[];
  isActive?: boolean;
}

export interface AvailableSlot {
  date: string;
  dayName: string;
  slots: string[];
  fee: number;
}

export interface AvailableSlotsResponse {
  doctorId: string;
  sessionDuration: number;
  consultationFee: number;
  availableSlots: AvailableSlot[];
}

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

export const appointmentAPI = {
  createOrUpdateAvailability: (data: CreateAvailabilityData) =>
    apiClient.post('/appointment-availability', data),

  getDoctorAvailability: (doctorId: string) =>
    apiClient.get(`/appointment-availability/doctor/${doctorId}`),

  getAvailableSlots: (doctorId: string, startDate?: string, endDate?: string) => {
    const params: any = { doctorId };
    if (startDate) params.startDate = startDate;
    if (endDate)   params.endDate   = endDate;
    return apiClient.get('/appointment-availability/slots', { params });
  },

  updateAvailability: (doctorId: string, data: UpdateAvailabilityData) =>
    apiClient.put(`/appointment-availability/doctor/${doctorId}`, data),

  deleteAvailability: (doctorId: string) =>
    apiClient.delete(`/appointment-availability/doctor/${doctorId}`),

  getAllDoctorsWithAvailability: () =>
    apiClient.get('/appointment-availability/doctors'),
};

// ✅ Use fetch instead of axios for file uploads
// axios has known issues with multipart/form-data in React Native / Expo Go
const uploadWithFetch = async (
  url: string,
  uri: string,
  name: string,
  mimeType: string,
  fields: Record<string, string>,
): Promise<{ data: any }> => {
  console.log('[fetch upload] url:', url);
  console.log('[fetch upload] file:', { uri, name, mimeType });

  const form = new FormData();

  // ✅ Append file with correct structure for React Native
  form.append('file', {
    uri,
    name,
    type: mimeType,
  } as any);

  // ✅ Append extra fields
  Object.entries(fields).forEach(([key, value]) => {
    form.append(key, value);
  });

  const response = await fetch(url, {
    method: 'POST',
    body: form,
    // ✅ Do NOT set Content-Type — fetch sets it automatically with boundary
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[fetch upload] server error:', response.status, text);
    throw new Error(`Server error ${response.status}: ${text}`);
  }

  const data = await response.json();
  console.log('[fetch upload] success:', data);
  return { data };
};

export const chatAPI = {
  getHistory: (conversationId: string, page = 1, limit = 50) =>
    apiClient.get(`/chat/history/${conversationId}?page=${page}&limit=${limit}`),

  getConversations: (userId: string) =>
    apiClient.get(`/chat/conversations/${userId}`),

  getOrCreateConversation: (doctorId: string, patientId: string) =>
    apiClient.post('/chat/conversation', { doctorId, patientId }),

  // ✅ Now uses fetch — fixes Network Error with multipart in Expo Go
  uploadFile: (
    formData: FormData,
    fileType: string,
    // extra params extracted from formData for fetch
    fileInfo?: { uri: string; name: string; mimeType: string; conversationId: string; receiverId: string; duration?: string },
  ) => {
    if (fileInfo) {
      const url = `${API_URL}/chat/upload?fileType=${fileType}`;
      return uploadWithFetch(url, fileInfo.uri, fileInfo.name, fileInfo.mimeType, {
        conversationId: fileInfo.conversationId,
        receiverId:     fileInfo.receiverId,
        duration:       fileInfo.duration ?? '0',
      });
    }
    // fallback to axios if no fileInfo
    return axios.post(`${API_URL}/chat/upload?fileType=${fileType}`, formData, {
      headers: { 'Accept': 'application/json' },
      timeout: 120000,
    });
  },
};

export default apiClient;