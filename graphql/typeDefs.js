const { gql } = require('apollo-server-express');

module.exports = gql`
  type User {
    username: String!
    favorecidos: [String!]!
    saldo: Float!
  }

  type Transfer {
    from: String!
    to: String!
    value: Float!
    date: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    users: [User!]!
    transfers: [Transfer!]!
  }

  type Mutation {
    registerUser(username: String!, password: String!, favorecidos: [String!]): User!
    loginUser(username: String!, password: String!): AuthPayload!
    createTransfer(from: String!, to: String!, value: Float!): Transfer!
  }
`;
