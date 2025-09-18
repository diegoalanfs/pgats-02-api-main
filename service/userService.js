const { users } = require('../model/userModel');
const bcrypt = require('bcryptjs');

function findUserByUsername(username) {
  return users.find(u => u.username === username);
}

function registerUser({ username, password, favorecidos = [] }) {
  if (findUserByUsername(username)) {
    throw new Error('Usuário já existe');
  }
  const hashedPassword = bcrypt.hashSync(password, 8);
  const user = { username, password: hashedPassword, favorecidos, saldo: 10000 };
  users.push(user);
  return { username, favorecidos, saldo: user.saldo };
}

function loginUser({ username, password }) {
  const user = findUserByUsername(username);
  if (!user) throw new Error('Usuário não encontrado');
  if (!bcrypt.compareSync(password, user.password)) throw new Error('Senha inválida');
  return { username: user.username, favorecidos: user.favorecidos, saldo: user.saldo };
}

function listUsers() {
  return users.map(u => ({ username: u.username, favorecidos: u.favorecidos, saldo: u.saldo }));
}

module.exports = { registerUser, loginUser, listUsers, findUserByUsername };
