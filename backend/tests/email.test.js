import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals'
import { connectDB, disconnectDB, clearDB } from './setup/db.js'
import { sendAlertEmail, sendOtpEmail, buildLockoutEmail, buildNewDeviceEmail, buildOverdueEmail, buildPinChangedEmail, buildPinResetEmail } from '../services/mail.js'
import nodemailer from 'nodemailer'

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mock-msg-id' })

beforeAll(() => {
  nodemailer.createTransport = jest.fn(() => ({ sendMail: mockSendMail }))
  connectDB()
})

afterAll(disconnectDB)
beforeEach(() => {
  mockSendMail.mockClear()
  clearDB()
})

describe('Email builders', () => {
  it('buildLockoutEmail returns correct subject', () => {
    const result = buildLockoutEmail('Test User', 'test@example.com')
    expect(result.subject).toContain('Locked')
    expect(result.text).toContain('test@example.com')
    expect(result.text).toContain('Test User')
  })

  it('buildNewDeviceEmail returns correct subject', () => {
    const result = buildNewDeviceEmail('Test User', 'test@test.com', 'Chrome on Windows')
    expect(result.subject).toContain('New Sign-In')
    expect(result.text).toContain('Chrome on Windows')
  })

  it('buildOverdueEmail returns overdue details', () => {
    const dueDate = new Date('2025-01-15')
    const result = buildOverdueEmail('Test User', 'Buyer Co', 'INV-001', 10000, dueDate, 500)
    expect(result.subject).toContain('overdue')
    expect(result.text).toContain('Buyer Co')
    expect(result.text).toContain('INV-001')
    expect(result.text).toContain('500')
    expect(result.text).toContain('Test User')
  })

  it('buildPinChangedEmail returns correct subject', () => {
    const result = buildPinChangedEmail('Test User')
    expect(result.subject).toContain('PIN Changed')
    expect(result.text).toContain('Test User')
  })

  it('buildPinResetEmail returns correct subject', () => {
    const result = buildPinResetEmail('Test User')
    expect(result.subject).toContain('PIN Reset')
    expect(result.text).toContain('Test User')
  })
})

describe('sendAlertEmail', () => {
  it('sends email via nodemailer with correct args', async () => {
    process.env.SMTP_HOST = 'smtp.test.com'
    process.env.SMTP_USER = 'test@test.com'
    process.env.SMTP_PASS = 'password'

    mockSendMail.mockClear()
    nodemailer.createTransport.mockClear()

    await sendAlertEmail({ to: 'test@example.com', subject: 'Test Subject', text: 'Test body' })

    expect(mockSendMail).toHaveBeenCalledTimes(1)
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      })
    )
  })

  it('does not crash when email send fails', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP error'))

    await expect(
      sendAlertEmail({ to: 'fail@test.com', subject: 'Fail', text: 'Body' })
    ).resolves.not.toThrow()
  })
})

describe('sendOtpEmail', () => {
  it('does not crash when Resend and nodemailer both fail', async () => {
    process.env.RESEND_API_KEY = 'test-resend-key'
    process.env.SMTP_HOST = 'smtp.test.com'
    process.env.SMTP_USER = 'u'
    process.env.SMTP_PASS = 'p'

    // Make Resend mock fail then fallback to nodemailer which also fails
    const { Resend } = await import('resend')
    Resend.prototype.emails.send = jest.fn().mockRejectedValue(new Error('Resend fail'))

    mockSendMail.mockRejectedValueOnce(new Error('Nodemailer fail'))

    const result = await sendOtpEmail('test@example.com', '123456')
    expect(result).toBe(false)
  })
})
