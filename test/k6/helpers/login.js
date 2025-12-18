import http from 'k6/http';
import { check } from 'k6';
import { getBaseURL } from './getBaseURL.js';

export function login(username, password) {
  const baseURL = getBaseURL();
  
  const loginPayload = {
    username: username,
    password:password
  };
  
  const response = http.post(`${baseURL}/users/login`, JSON.stringify(loginPayload), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => r.body.includes('token'),
  });
  
  const token = response.json('token');
  return token;
}
