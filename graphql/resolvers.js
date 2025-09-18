const userService = require('../service/userService');
const transferService = require('../service/transferService');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'secretdemo';

module.exports = {
  Query: {
    users: () => userService.listUsers(),
    transfers: (parent, args, context) => {
      if (!context.user) throw new Error('Autenticação obrigatória');
      return transferService.listTransfers();
    },
  },
  Mutation: {
    registerUser: (parent, { username, password, favorecidos }) => {
      return userService.registerUser({ username, password, favorecidos });
    },
    loginUser: (parent, { username, password }) => {
      const user = userService.loginUser({ username, password });
      const token = jwt.sign({ username: user.username }, SECRET, { expiresIn: '1h' });
      return { token, user };
    },
    createTransfer: (parent, { from, to, value }, context) => {
      if (!context.user) throw new Error('Autenticação obrigatória');
      return transferService.transfer({ from, to, value });
    },
  },
};
