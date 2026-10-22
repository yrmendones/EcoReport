const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Retry SMTP verification up to 3 times over 15 seconds.
let smtpAttempts = 0;
const MAX_SMTP_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

const verifySMTP = () => {
    smtpAttempts++;
    transporter.verify()
        .then(() => {
            console.log('✅ Gmail SMTP ready - emails will be delivered.');
        })
        .catch((err) => {
            if (smtpAttempts < MAX_SMTP_ATTEMPTS) {
                setTimeout(verifySMTP, RETRY_DELAY_MS);
            } else {
                console.error('❌ Gmail SMTP verification failed:', err.message);
            }
        });
};

verifySMTP();

async function sendPasswordResetEmail(to, resetLink, fullName) {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #333;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0B5D2A; font-size: 26px; margin: 0;">EcoReport</h1>
                <p style="color: #666; font-size: 13px; margin: 4px 0 0 0;">
                    Barangay Sto. Rosario Kanluran
                </p>
            </div>

            <h2 style="color: #0B5D2A; font-size: 20px; margin-top: 0;">Password Reset Request</h2>
            <p style="font-size: 14px; line-height: 1.6;">Hi ${fullName || 'there'},</p>
            <p style="font-size: 14px; line-height: 1.6;">
                We received a request to reset the password for your EcoReport account.
                Click the button below to set a new password. This link is valid for
                <strong>30 minutes</strong>.
            </p>

            <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}"
                   style="display: inline-block; background: #0B5D2A; color: #ffffff;
                          text-decoration: none; padding: 14px 32px; border-radius: 10px;
                          font-size: 14px; font-weight: 700;">
                    Reset Password
                </a>
            </div>

            <p style="font-size: 12px; color: #666; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #0B5D2A; word-break: break-all;">${resetLink}</p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />

            <p style="font-size: 11px; color: #999; line-height: 1.6;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password will not be changed.
            </p>
            <p style="font-size: 11px; color: #999; line-height: 1.6; margin-top: 16px;">
                — The EcoReport Team
            </p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: 'EcoReport — Password Reset Request',
        html,
    });

        console.log(`✅ Password reset email sent to ${to}`);
}

async function sendNotificationEmail(to, title, message, type = 'Notification') {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #333;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0B5D2A; font-size: 26px; margin: 0;">EcoReport</h1>
                <p style="color: #666; font-size: 13px; margin: 4px 0 0 0;">
                    Barangay Sto. Rosario Kanluran
                </p>
            </div>

            <div style="background: #F0F8ED; border: 1px solid #A9C9A1; border-radius: 12px; padding: 20px 22px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px 0; color: #0B5D2A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;">
                    ${type}
                </p>
                <h2 style="color: #0B5D2A; font-size: 20px; margin: 0 0 12px 0;">${title}</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #333; margin: 0; white-space: pre-line;">
                    ${message}
                </p>
            </div>

            <div style="text-align: center; margin: 28px 0;">
                <a href="${process.env.MOBILE_APP_URL || 'http://localhost:5173'}"
                   style="display: inline-block; background: #0B5D2A; color: #ffffff;
                          text-decoration: none; padding: 13px 32px; border-radius: 10px;
                          font-size: 14px; font-weight: 700;">
                    Open EcoReport App
                </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />

            <p style="font-size: 11px; color: #999; line-height: 1.6; text-align: center;">
                You received this because you enabled email notifications in the EcoReport mobile app.<br/>
                To turn it off, open the app → Profile → Privacy Settings.
            </p>
            <p style="font-size: 11px; color: #999; line-height: 1.6; text-align: center; margin-top: 16px;">
                — The EcoReport Team
            </p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: `EcoReport — ${title}`,
        html,
    });

    console.log(`✅ Notification email sent to ${to} (${type})`);
}

async function sendVerificationCodeEmail(to, code, fullName) {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #333;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0B5D2A; font-size: 26px; margin: 0;">EcoReport</h1>
                <p style="color: #666; font-size: 13px; margin: 4px 0 0 0;">
                    Barangay Sto. Rosario Kanluran
                </p>
            </div>

            <h2 style="color: #0B5D2A; font-size: 20px; margin-top: 0;">Password Reset Code</h2>
            <p style="font-size: 14px; line-height: 1.6;">Hi ${fullName || "there"},</p>
            <p style="font-size: 14px; line-height: 1.6;">
                Enter this verification code to reset your password.
                This code is valid for <strong>10 minutes</strong>.
            </p>

            <div style="text-align: center; margin: 32px 0;">
                <div style="display: inline-block; background: #F0F8ED; border: 2px solid #0B5D2A;
                            border-radius: 12px; padding: 20px 40px; letter-spacing: 12px;
                            font-size: 34px; font-weight: 800; color: #0B5D2A;
                            font-family: 'Courier New', monospace;">
                    ${code}
                </div>
            </div>

            <p style="font-size: 12px; color: #666; line-height: 1.6;">
                If you didn't request a password reset, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />

            <p style="font-size: 11px; color: #999; line-height: 1.6; margin-top: 16px;">
                — The EcoReport Team
            </p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: "EcoReport — Password Reset Code",
        html,
    });

    console.log(`✅ Verification code sent to ${to}`);
}

module.exports = { sendPasswordResetEmail, sendNotificationEmail, sendVerificationCodeEmail };