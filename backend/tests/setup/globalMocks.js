// ─── Mock Firebase Admin / JWT verification ───────────────────────────────
// The auth middleware fetches Firebase certs from Google's API.
// We mock fetch globally so tests never hit real Google endpoints.

import crypto from 'crypto'

const mockKid = 'test-kid'
const mockPrivateKey = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
}).privateKey

const mockPublicKey = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
}).publicKey

global.__MOCK_KEYS__ = { [mockKid]: mockPublicKey }
global.__MOCK_PRIVATE_KEY__ = mockPrivateKey
global.__MOCK_KID__ = mockKid

// Patch jwt.decode to return a predictable header with our mock kid
import jwt from 'jsonwebtoken'

const origDecode = jwt.decode
jwt.decode = function (token, options) {
  const decoded = origDecode.call(this, token, { ...options, complete: true })
  if (decoded && decoded.header) {
    decoded.header.kid = mockKid
  }
  return decoded
}

// Mock global fetch to return our test public keys
global.fetch = async (url) => {
  if (url.includes('googleapis.com')) {
    return {
      ok: true,
      headers: new Map(Object.entries({
        'cache-control': 'max-age=86400',
      })),
      json: async () => global.__MOCK_KEYS__,
    }
  }
  if (url.includes('google.com/recaptcha')) {
    return {
      ok: true,
      json: async () => ({ success: true }),
    }
  }
  throw new Error(`unexpected fetch: ${url}`)
}

// ─── Mock nodemailer / Resend ─────────────────────────────────────────────
// No emails should ever be sent during tests

import nodemailer from 'nodemailer'

const mockSendMail = async () => ({ messageId: 'mock-msg-id' })

nodemailer.createTransport = () => ({ sendMail: mockSendMail })

// Mock Resend
import { Resend as ResendClass } from 'resend'
const origResendProto = ResendClass.prototype
origResendProto.emails = {
  send: async () => ({ data: { id: 'mock-resend-id' }, error: null }),
}

// Silence console.log / error during tests (optional — uncomment if too noisy)
// jest.spyOn(console, 'log').mockImplementation(() => {})
// jest.spyOn(console, 'error').mockImplementation(() => {})
