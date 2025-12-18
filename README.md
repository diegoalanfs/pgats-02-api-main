# API de Transferências e Usuários

Esta API permite o registro, login, consulta de usuários e transferências de valores entre usuários. O objetivo é servir de base para estudos de testes e automação de APIs.

## Tecnologias
- Node.js
- Express
- Swagger (documentação)
- Banco de dados em memória (variáveis)

## Instalação

1. Clone o repositório:
   ```sh
   git clone <repo-url>
   cd pgats-02-api
   ```
2. Instale as dependências:
   ```sh
   npm install express swagger-ui-express bcryptjs
   ```

## Configuração

Antes de seguir, crie um arquivo .env na pasta raiz contendo as propriedades BASE_URL_REST E BASE_URL_GRAPHQL, com a URL desses serviços.

## Como rodar

- Para iniciar o servidor:
  ```sh
  node server.js
  ```
- A API estará disponível em `http://localhost:3000`
- A documentação Swagger estará em `http://localhost:3000/api-docs`

## Endpoints principais

### Registro de usuário
- `POST /users/register`
  - Body: `{ "username": "string", "password": "string", "favorecidos": ["string"] }`

### Login
- `POST /users/login`
  - Body: `{ "username": "string", "password": "string" }`

### Listar usuários
- `GET /users`

### Transferências
- `POST /transfers`
  - Body: `{ "from": "string", "to": "string", "value": number }`
- `GET /transfers`

### GraphQL Types, Queries e Mutations

Rode `npm run start-graphql` para executar a API do GraphQL e acesse a URL http://localhost:4000/graphql para acessá-la.

- **Types:**
  - `User`: username, favorecidos, saldo
  - `Transfer`: from, to, value, date
- **Queries:**
  - `users`: lista todos os usuários
  - `transfers`: lista todas as transferências (requer autenticação JWT)
- **Mutations:**
  - `registerUser(username, password, favorecidos)`: retorna User
  - `loginUser(username, password)`: retorna token + User
  - `createTransfer(from, to, value)`: retorna Transfer (requer autenticação JWT)

## Regras de negócio
- Não é permitido registrar usuários duplicados.
- Login exige usuário e senha.
- Transferências acima de R$ 5.000,00 só podem ser feitas para favorecidos.
- O saldo inicial de cada usuário é de R$ 10.000,00.

## Testes
- O arquivo `app.js` pode ser importado em ferramentas de teste como Supertest.
- Para testar a API GraphQL, importe `graphql/app.js` nos testes.

---

Para dúvidas, consulte a documentação Swagger, GraphQL Playground ou o código-fonte.


# Guia de Testes de Performance com K6

Este documento detalha os conceitos e técnicas de teste de performance empregados nos testes K6 da API de Transferências e Usuários. Os testes estão localizados em `test/k6/` e utilizam a ferramenta K6 para validar performance, confiabilidade e comportamento sob carga.

## Conceitos Fundamentais

### Thresholds

Thresholds definem critérios de sucesso ou falha para métricas de performance. Eles permitem validar se o teste atende aos requisitos de performance antes de concluir.

**Como está sendo utilizado:**

No arquivo `test/k6/transfer.test.js`, o threshold valida que o percentil 95 (p95) do tempo de resposta das requisições HTTP seja menor que 2 segundos:

```javascript
export const options = {
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95th percentile must be less than 2 seconds
    },
};
```

**Explicação:**
- `http_req_duration`: métrica padrão do K6 que mede a duração de cada requisição HTTP em milissegundos.
- `p(95)<2000`: verifica se o percentil 95 é menor que 2000ms (2 segundos).
- Se o threshold não for atendido, o teste falha e a saída indica qual métrica não passou.

---

### Checks

Checks são validações que verificam se as respostas de requisições atendem aos requisitos esperados. Diferente de Thresholds, Checks não interrompem o teste se falharem, mas registram o resultado para análise posterior.

**Como está sendo utilizado:**

No `test/k6/transfer.test.js`, Checks validam status codes e conteúdos esperados:

```javascript
group('Register User', () => {
    const registerResponse = http.post(
        `${baseURL}/users/register`,
        JSON.stringify(registerPayload),
        { headers: { 'Content-Type': 'application/json' } }
    );

    check(registerResponse, {
        'register status is 201': (r) => r.status === 201,
    });
});
```

**Explicação:**
- Cada Check verifica uma condição específica.
- No exemplo, validamos se o status da resposta é 201 (Created).
- O resultado é registrado como "passed" ou "failed" sem interromper o teste.

---

### Helpers

Helpers são funções reutilizáveis que encapsulam lógica comum para evitar duplicação de código e facilitar manutenção.

**Como está sendo utilizado:**

O helper `test/k6/helpers/login.js` encapsula a lógica de login:

```javascript
// test/k6/helpers/login.js
export function login(username, password) {
  const baseURL = getBaseURL();
  
  const loginPayload = {
    username: username,
    password: password
  };
  
  const response = http.post(`${baseURL}/users/login`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => r.body.includes('token'),
  });
  
  const token = response.json('token');
  return token;
}
```

**Uso no teste principal:**

```javascript
// test/k6/transfer.test.js
import { login } from './helpers/login.js';

group('Login User', () => {
    token = login(user.username, user.password);
});
```

**Explicação:**
- O helper `login()` encapsula toda a lógica de fazer POST para `/users/login` e extrair o token.
- Reutilizável em múltiplos testes sem duplicar código.
- Facilita manutenção: mudanças na lógica de login são feitas em um único lugar.

---

### Trends

Trends são métricas customizadas que rastreiam valores numéricos ao longo do tempo, permitindo análise estatística de dados específicos.

**Como está sendo utilizado:**

No `test/k6/transfer.test.js`, uma Trend rastreia o tempo de duração das requisições de transferência:

```javascript
import { Trend } from 'k6/metrics';

const transferDuration = new Trend('transfer_duration');

group('Transfer', () => {
    const transferResponse = http.post(
        `${baseURL}/transfers`,
        JSON.stringify(transferPayload),
        { headers: { 'Authorization': `Bearer ${token}` } }
    );

    // Record the transfer duration in the Trend metric
    transferDuration.add(transferResponse.timings.duration);
});
```

**Explicação:**
- `new Trend('transfer_duration')`: cria uma métrica customizada chamada "transfer_duration".
- `transferDuration.add(value)`: adiciona cada valor de duração à Trend.
- Na saída do teste, K6 mostra estatísticas como `avg`, `min`, `med`, `max`, `p(90)`, `p(95)`, etc.

---

### Faker

Faker é uma biblioteca que gera dados aleatórios realistas (nomes, emails, senhas, etc.), útil para Data-Driven Testing e simulação de múltiplos usuários.

**Como está sendo utilizado:**

No `test/k6/transfer.test.js`, Faker gera usernames e passwords únicos para cada registração:

```javascript
import faker from "k6/x/faker";

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
        { headers: { 'Content-Type': 'application/json' } }
    );

    check(registerResponse, {
        'register status is 201': (r) => r.status === 201,
    });
});
```

**Explicação:**
- `faker.internet.username()`: gera um username aleatório e único.
- `faker.internet.password()`: gera uma senha aleatória.
- Cada iteração do teste cria um novo usuário com dados diferentes.
- Isso simula cenários reais onde múltiplos usuários se registram simultaneamente.

---

### Variáveis de Ambiente

Variáveis de ambiente permitem passar configurações dinâmicas via linha de comando, facilitando testes em diferentes ambientes (local, staging, produção).

**Como está sendo utilizado:**

No `test/k6/helpers/getBaseURL.js`, a variável de ambiente `BASE_URL` é lida:

```javascript
export function getBaseURL() {
  const baseURL = __ENV.BASE_URL;
  return baseURL || 'http://localhost:3000';
}
```

**Uso no teste:**

```javascript
const baseURL = getBaseURL();
```

**Como rodar com variável de ambiente:**

```bash
k6 run test/k6/transfer.test.js --env BASE_URL=http://localhost:3000
```

**Explicação:**
- `__ENV.BASE_URL`: acessa a variável de ambiente `BASE_URL` passada via CLI.
- `||`: fornece um valor padrão se a variável não for definida.
- Permite reutilizar o mesmo teste em diferentes URLs sem alterar o código.

---

### Stages

Stages definem um padrão progressivo de carga, simulando diferentes volumes de usuários virtuais em diferentes períodos de tempo. Eles permitem testar como o sistema se comporta durante ramp-up, carga média, picos e ramp-down.

**Como está sendo utilizado:**

No `test/k6/transfer.test.js`, stages definem um cenário de teste realista:

```javascript
export const options = {
    stages: [
        { duration: '3s', target: 10 },   // Ramp up: aumenta de 0 para 10 VUs em 3s
        { duration: '15s', target: 10 },  // Average: mantém 10 VUs por 15s
        { duration: '2s', target: 100 },  // Spike: aumenta para 100 VUs em 2s
        { duration: '3s', target: 100 },  // Spike: mantém 100 VUs por 3s
        { duration: '5s', target: 10 },   // Average: reduz para 10 VUs em 5s
        { duration: '5s', target: 0 },    // Ramp down: reduz para 0 VUs em 5s
    ],
};
```

**Explicação:**
- Simula um cenário realista: usuários chegam gradualmente, carga normal, pico inesperado, depois redução.
- Útil para identificar gargalos em momentos de pico.
- Total de duração: 3 + 15 + 2 + 3 + 5 + 5 = 33 segundos.

---

### Reaproveitamento de Dados

Reaproveitamento de dados (Data Reuse) utiliza dados compartilhados entre iterações para evitar leitura repetida de arquivos e economizar recursos.

**Como está sendo utilizado:**

No `test/k6/transfer.test.js`, dados de usuários são carregados uma vez e reutilizados:

```javascript
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
    return JSON.parse(open('./data/login.test.data.json'));
});

export default function () {
    const userIndex = (__VU - 1) % users.length;
    const user = users[userIndex];
    const otherUser = users[(userIndex + 1) % users.length];
    
    group('Login User', () => {
        token = login(user.username, user.password);
    });
}
```

**Arquivo de dados (`test/k6/data/login.test.data.json`):**

```json
[
  {
    "username": "julio", 
    "password": "123456" 
  },
  {
    "username": "priscila", 
    "password": "123456" 
  }
]
```

**Explicação:**
- `SharedArray`: carrega dados uma única vez na memória compartilhada, acessível a todos os VUs.
- `(__VU - 1) % users.length`: distribui usuários entre os VUs de forma cíclica.
  - VU 1 → usuário 0 (julio)
  - VU 2 → usuário 1 (priscila)
  - VU 3 → usuário 0 (julio) novamente
- Economiza I/O e memória em comparação com carregar dados em cada iteração.

---

### Uso de Token de Autenticação

Tokens JWT são usados para autenticar requisições subsequentes após login bem-sucedido, simulando fluxos de usuários logados.

**Como está sendo utilizado:**

No `test/k6/transfer.test.js`, o token obtido no login é reutilizado na requisição de transferência:

```javascript
let token;

group('Login User', () => {
    token = login(user.username, user.password);
});

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

    check(transferResponse, {
        'transfer status is 201': (r) => r.status === 201,
    });
});
```

**Explicação:**
- O token é armazenado em uma variável `let token;` declarada no escopo externo.
- No header `Authorization`, usa-se o padrão `Bearer ${token}` (Bearer Token).
- O servidor valida o token no middleware de autenticação.
- Simula fluxos reais onde usuários fazem login e depois executam ações autenticadas.

---

### Data-Driven Testing

Data-Driven Testing consiste em executar o mesmo teste com múltiplos conjuntos de dados, validando comportamento em diferentes cenários.

**Como está sendo utilizado:**

No `test/k6/transfer.test.js`, múltiplos usuários do arquivo `login.test.data.json` são usados em diferentes iterações:

```javascript
const users = new SharedArray('users', function () {
    return JSON.parse(open('./data/login.test.data.json'));
});

export default function () {
    const userIndex = (__VU - 1) % users.length;
    const user = users[userIndex];

    group('Login User', () => {
        token = login(user.username, user.password);
    });

    group('Transfer', () => {
        const transferPayload = {
            from: user.username,
            to: otherUser.username,
            value: 10
        };
        // ... realiza transferência com dados do usuário
    });
}
```

**Explicação:**
- O mesmo fluxo de teste é executado múltiplas vezes com usuários diferentes.
- Testa se a API funciona corretamente com diferentes dados de entrada.
- Valida comportamento em múltiplos cenários sem duplicar lógica de teste.
- Com 10 VUs e stages, centenas de iterações são executadas, cada uma com dados diferentes.

---

### Groups

Groups permitem organizar requisições logicamente, facilitando leitura de relatórios e identificação de gargalos em etapas específicas do teste.

**Como está sendo utilizado:**

No `test/k6/transfer.test.js`, grupos separam fluxos distintos:

```javascript
group('Register User', () => {
    const username = faker.internet.username();
    const password = faker.internet.password();

    const registerResponse = http.post(
        `${baseURL}/users/register`,
        JSON.stringify(registerPayload),
        { headers: { 'Content-Type': 'application/json' } }
    );

    check(registerResponse, {
        'register status is 201': (r) => r.status === 201,
    });
});

group('Login User', () => {
    token = login(user.username, user.password);
});

group('Transfer', () => {
    const transferPayload = {
        from: user.username,
        to: otherUser.username,
        value: 10
    };

    const transferResponse = http.post(
        `${baseURL}/transfers`,
        JSON.stringify(transferPayload),
        { headers: { 'Authorization': `Bearer ${token}` } }
    );

    check(transferResponse, {
        'transfer status is 201': (r) => r.status === 201,
    });
});
```

**Explicação:**
- Cada `group()` agrupa requisições relacionadas.
- Na saída do teste, K6 mostra estatísticas separadas por grupo (tempo médio, requisições, etc.).
- Facilita identificação de qual etapa do fluxo está lenta ou falhando.
- Exemplo de saída:
  ```
  group_duration{group:::Register User}........: avg=150ms
  group_duration{group:::Login User}............: avg=120ms
  group_duration{group:::Transfer}.............: avg=180ms
  ```

---

## Executando os Testes

### Comando básico:

```bash
k6 run test/k6/transfer.test.js --env BASE_URL=http://localhost:3000
```

### Com variáveis de ambiente adicionais (Relatórios Online):

```bash
$env:K6_WEB_DASHBOARD='true'; k6 run test/k6/transfer.test.js --env BASE_URL=http://localhost:3000
```

### Com variáveis de ambiente adicionais (Relatórios Online e HTML):

```bash
$env:K6_WEB_DASHBOARD='true'; $env:K6_WEB_DASHBOARD_EXPORT='html-report.html'; k6 run test/k6/transfer.test.js --env BASE_URL=http://localhost:3000
```


### Interpretando resultados:

- **Thresholds**: Aparecem no início com ✓ (passou) ou ✗ (falhou).
- **Checks**: Mostram percentual de sucesso/falha de cada validação.
- **Trends**: Exibem estatísticas de métricas customizadas (avg, min, med, max, p90, p95).
- **Groups**: Listam duração e requisições por grupo.

---

## Estrutura de Arquivos

```
test/
├── k6/
│   ├── transfer.test.js          # Teste principal de transferências
│   ├── helpers/
│   │   ├── getBaseURL.js         # Helper para obter BASE_URL
│   │   └── login.js              # Helper para login com validações
│   └── data/
│       └── login.test.data.json   # Dados compartilhados de usuários
```

---

## Melhores Práticas

1. **Sempre use Helpers** para lógica reutilizável (login, requisições comuns, etc.).
2. **Organize com Groups** para melhor rastreabilidade de performance por etapa.
3. **Use SharedArray** para dados grandes que não mudam durante o teste.
4. **Defina Thresholds** realistas baseados em requisitos de negócio.
5. **Combine Checks com Thresholds** para validação abrangente.
6. **Use Stages progressivos** para simular cenários realistas de carga.
7. **Reutilize Tokens** em requisições subsequentes para simular sessões reais.
8. **Documente Trends customizadas** para facilitar análise de métricas específicas.

---

## Referências

- [Documentação oficial do K6](https://k6.io/docs/)
- [K6 Scripting API](https://k6.io/docs/api/)
- [K6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [K6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
