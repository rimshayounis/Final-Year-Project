import axios from 'axios'
export const API_URL = 'http://172.20.10.2:3000/api';
export const SOCKET_URL = 'http://172.20.10.2:3000';
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

export const reportAPI = {
  submit: (data: {
    reporterId: string;
    reporterModel?: string;
    reportedId: string;
    reportedModel?: string;
    reason: string;
     postId?: string; 
  }) => apiClient.post('/reports', data),
};

export const feedbackAPI = {
  submit: (data: {
    appointmentId: string;
    userId: string;
    doctorId: string;
    rating: number;
    description?: string;
  }) => apiClient.post('/feedback', data),

  getDoctorFeedbacks: (doctorId: string) =>
    apiClient.get(`/feedback/doctor/${doctorId}`),
};

export const postAPI = {
  createPost: (formData: FormData) =>
    axios.post(`${API_URL}/posts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }),

  updatePost: (postId: string, formData: FormData) =>
    axios.patch(`${API_URL}/posts/${postId}`, formData, {
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
  interests?: string[];
}

export interface EmergencyContactData {
  fullName:     string;
  relationship: string;
  email:        string;
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

  getFriendSuggestions: (userId: string) =>
    apiClient.get(`/users/${userId}/suggestions`),

  searchUsers: (query: string, excludeUserId: string) =>
    apiClient.get(`/users/search/users?q=${encodeURIComponent(query)}&exclude=${excludeUserId}`),

  blockUser:       (userId: string, targetId: string) =>
    apiClient.post(`/users/${userId}/block/${targetId}`),

  unblockUser:     (userId: string, targetId: string) =>
    apiClient.post(`/users/${userId}/unblock/${targetId}`),

  getBlockedUsers: (userId: string) =>
    apiClient.get(`/users/${userId}/blocked`),

  getBlockStatus:  (userId: string, targetId: string) =>
    apiClient.get(`/users/${userId}/block-status/${targetId}`),

  updateUser: (userId: string, data: any) =>
    apiClient.put(`/users/${userId}`, data),

  deleteUser: (userId: string) =>
    apiClient.delete(`/users/${userId}`),

  // ── Forgot password ────────────────────────────────────────────────────────
  forgotPassword: (email: string) =>
    apiClient.post('/users/forgot-password', { email }),

  verifyOtp: (email: string, otpCode: string) =>
    apiClient.post('/users/verify-otp', { email, otpCode }),

  resetPassword: (email: string, otpCode: string, newPassword: string) =>
    apiClient.post('/users/reset-password', { email, otpCode, newPassword }),
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

  resubmit: (doctorId: string, data: FormData) =>
    axios.put(`${API_URL}/doctors/${doctorId}/resubmit`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }),

  getVerifiedDoctors: () =>
    apiClient.get('/doctors/verified/list'),

  // ── Forgot password ────────────────────────────────────────────────────────
  forgotPassword: (email: string) =>
    apiClient.post('/doctors/forgot-password', { email }),

  verifyOtp: (email: string, otpCode: string) =>
    apiClient.post('/doctors/verify-otp', { email, otpCode }),

  resetPassword: (email: string, otpCode: string, newPassword: string) =>
    apiClient.post('/doctors/reset-password', { email, otpCode, newPassword }),
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

  getOwnAvailability: (doctorId: string) =>
    apiClient.get(`/appointment-availability/doctor/${doctorId}/own`),

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
  form.append('file', { uri, name, type: mimeType } as any);
  Object.entries(fields).forEach(([key, value]) => { form.append(key, value); });

  const response = await fetch(url, { method: 'POST', body: form });

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

  // ── User-to-user chat ─────────────────────────────────────────────────
  getOrCreateUserConversation: (userId1: string, userId2: string) =>
    apiClient.post('/chat/user-conversation', { userId1, userId2 }),

  getUserToUserConversations: (userId: string) =>
    apiClient.get(`/chat/user-conversations/${userId}`),

  markUserConversationRead: (conversationId: string, userId: string) =>
    apiClient.post(`/chat/user-conversation/${conversationId}/read`, { userId }),

  uploadFile: (
    formData: FormData,
    fileType: string,
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
    return axios.post(`${API_URL}/chat/upload?fileType=${fileType}`, formData, {
      headers: { 'Accept': 'application/json' },
      timeout: 120000,
    });
  },
};

export default apiClient;
