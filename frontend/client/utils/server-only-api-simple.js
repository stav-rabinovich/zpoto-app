/**
 * API פשוט לServer-Only Architecture
 */

import api from './api';

// API functions for different modules
export const authAPI = {
  async login(email, password) {
    return api.post('/api/auth/login', { email, password });
  },

  async register(userData) {
    return api.post('/api/auth/register', userData);
  },

  async logout() {
    return api.post('/api/auth/logout');
  },

  async me() {
    return api.get('/api/auth/me');
  }
};

export const profileAPI = {
  async get() {
    return api.get('/api/users/profile');
  },

  async update(data) {
    return api.put('/api/users/profile', data);
  },

  async updatePassword(currentPassword, newPassword) {
    return api.put('/api/users/password', { currentPassword, newPassword });
  },

  async delete() {
    return api.delete('/api/users/profile');
  }
};

export const vehiclesAPI = {
  async getAll() {
    return api.get('/api/vehicles');
  },

  async create(data) {
    return api.post('/api/vehicles', data);
  },

  async update(id, data) {
    return api.put(`/api/vehicles/${id}`, data);
  },

  async delete(id) {
    return api.delete(`/api/vehicles/${id}`);
  },

  async setDefault(id) {
    return api.patch(`/api/vehicles/${id}/default`);
  }
};

export const bookingsAPI = {
  async getAll() {
    return api.get('/api/bookings');
  },

  async get(id) {
    return api.get(`/api/bookings/${id}`);
  },

  async create(data) {
    return api.post('/api/bookings', data);
  },

  async cancel(id) {
    return api.patch(`/api/bookings/${id}/cancel`);
  }
};

// Default export
const serverOnlyAPI = {
  auth: authAPI,
  profile: profileAPI,
  vehicles: vehiclesAPI,
  bookings: bookingsAPI
};

export default serverOnlyAPI;
