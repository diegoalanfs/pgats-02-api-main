import http from 'k6/http';
import { check, group } from 'k6';
import { Trend } from 'k6/metrics';
import { login } from './helpers/login.js';
import { getBaseURL } from './helpers/getBaseURL.js';
import faker from "k6/x/faker";
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
    return JSON.parse(open('./data/login.test.data.json'));
})

// Custom metric for transfer requests
const transferDuration = new Trend('transfer_duration');

// Test configuration
export const options = {
    //vus: 10,
    //duration: '15s',
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95th percentile must be less than 2 seconds
    },
    stages: [
        { duration: '3s', target: 10 }, // Ramp up
        { duration: '15s', target: 10 }, // Average
        { duration: '2s', target: 100 }, // Spike
        { duration: '3s', target: 100 }, // Spike
        { duration: '5s', target: 10 }, // Average
        { duration: '5s', target: 0 }, // Ramp down
    ],
};

export default function () {
    const baseURL = getBaseURL();
    let token;
    // seleciona o usuário a partir do arquivo (reaproveitando dados)
    const userIndex = (__VU - 1) % users.length;
    const user = users[userIndex];
    const otherUser = users[(userIndex + 1) % users.length];

    // Register a new user with unique username
    group('Register User', () => {
        const username = faker.internet.username();
        const password = faker.internet.password();

        const registerPayload = {
            username: username,
            password: password,
            favorecidos: []
        };

        const registerResponse = http.post(
            `${baseURL}/users/register`,
            JSON.stringify(registerPayload),
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        check(registerResponse, {
            'register status is 201': (r) => r.status === 201,
        });
    });

    // Perform login
    group('Login User', () => {
       // const user = users[(__VU - 1) % users.length]; // Reaproveitamento de dados
        token = login(user.username, user.password);
    });

    // Perform transfer with the token
    group('Transfer', () => {
        const transferPayload = {
            from: user.username,
            to: otherUser.username,
            value: 10
        };

        const transferResponse = http.post(
            `${baseURL}/transfers`,
            JSON.stringify(transferPayload),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        // Record the transfer duration in the Trend metric
        transferDuration.add(transferResponse.timings.duration);

        check(transferResponse, {
            'transfer status is 201': (r) => r.status === 201,
        });
    });
}
