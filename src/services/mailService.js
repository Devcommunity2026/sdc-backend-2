import transporter from '../config/mailer.js';
import logger from '../config/logger.js';
import errorClass from '../utils/errorClass.js';

const FROM_EMAIL = process.env.EMAIL_FROM || process.env.EMAIL_USER;

/**
 * Generate minimal OTP email HTML
 * @param {string|number} otp
 * @param {boolean} isResetFlow
 * @returns {string} HTML string
 */
const getOtpEmailHtml = (otp, isResetFlow) => {
    const title = isResetFlow ? 'Password Reset' : 'Verify Your Account';
    const message = isResetFlow
        ? 'You requested a password reset. Use the OTP below to proceed:'
        : 'Please use the OTP below to verify your account:';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0; padding:0; background-color:#f9f9f9; font-family:Arial, Helvetica, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; border:1px solid #e0e0e0; border-radius:8px; padding:32px;">

                    <tr><td style="padding-bottom:16px;">
                        <h2 style="margin:0; font-size:20px; color:#222;">${title}</h2>
                    </td></tr>

                    <tr><td style="padding-bottom:20px;">
                        <p style="margin:0; font-size:14px; color:#555; line-height:1.6;">${message}</p>
                    </td></tr>

                    <tr><td style="padding-bottom:20px;">
                        <p style="margin:0; font-size:32px; font-weight:bold; color:#111; letter-spacing:2px;">${otp}</p>
                    </td></tr>

                    <tr><td style="padding-bottom:20px;">
                        <p style="margin:0; font-size:13px; color:#888;">This OTP is valid for 5 minutes. Do not share it with anyone.</p>
                    </td></tr>

                    <tr><td style="border-top:1px solid #eee; padding-top:16px;">
                        <p style="margin:0; font-size:12px; color:#aaa;">If you did not request this, please ignore this email.</p>
                        <p style="margin:8px 0 0; font-size:12px; color:#aaa;">&copy; ${new Date().getFullYear()} SDC Web</p>
                    </td></tr>

                </table>
            </td></tr>
        </table>
    </body>
    </html>
    `;
};

/**
 * Sends an OTP email via Nodemailer and stores the OTP in memory.
 *
 * @param {Map}      otpStore       - In-memory map to store OTP data
 * @param {string}   email          - Recipient email address
 * @param {string}   password       - User password (only for registration flow)
 * @param {string}   name           - User name (only for registration flow)
 * @param {object}   res            - Express response object
 * @param {Function} next           - Express next middleware
 * @param {boolean}  changePassword - true = password-reset flow, false = registration flow
 */
export const sendOtp = async (otpStore, email, password, name, res, next, changePassword) => {
    const isResetFlow = !!changePassword;
    const flowName = isResetFlow ? 'Password Reset' : 'User Registration';

    logger.info(`[OTP] Initiating OTP request | Flow: ${flowName} | To: ${email}`);

    try {
        const otp = Math.floor(100000 + Math.random() * 900000);

        const subject = isResetFlow
            ? 'Password Reset OTP - SDC Web'
            : 'Verify Your Account - SDC Web';

        const textBody = isResetFlow
            ? `Your OTP to reset your password is ${otp}. It expires in 5 minutes.`
            : `Your OTP is ${otp}. It expires in 5 minutes.`;

        logger.info(`[OTP] Sending email via Nodemailer | From: ${FROM_EMAIL} | To: ${email} | Flow: ${flowName}`);

        const mailOptions = {
            from: `SDC Web Team <${FROM_EMAIL}>`,
            to: email,
            subject,
            text: textBody,
            html: getOtpEmailHtml(otp, isResetFlow),
        };

        await transporter.sendMail(mailOptions);

        logger.info(`[OTP] Email sent successfully | To: ${email}`);

        // Store OTP in memory
        const otpData = {
            otp,
            createdAt: Date.now(),
            expiresAt: Date.now() + 5 * 60 * 1000,
        };

        if (!isResetFlow) {
            otpData.password = password;
            otpData.name = name;
        }

        otpStore.set(email, otpData);

        logger.info(`[OTP] OTP stored in memory | To: ${email} | Expires in 5 minutes`);

        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
        });

    } catch (err) {
        logger.error(`[OTP] Failed to send email | To: ${email}`, {
            message: err.message,
            stack: err.stack,
        });
        const errObj = new errorClass(false, 500, 'Unable to send OTP', 'Failed to send email due to exception', err);
        return next(errObj);
    }
};