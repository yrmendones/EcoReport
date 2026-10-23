const { Resend } = require('resend');

// Initialize Resend with API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// verified domain later
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'EcoReport <onboarding@resend.dev>';

// ─── PASSWORD RESET EMAIL ───
async function sendPasswordResetEmail(to, resetLink, fullName) {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #333;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0B5D2A; font-size: 26px; margin: 0;">EcoReport</h1>
                <p style="color: #666; font-size: 13px; margin: 4px 0 0 0;">Barangay Sto. Rosario Kanluran</p>
            </div>
            <h2 style="color: #0B5D2A; font-size: 20px; margin-top: 0;">Password Reset Request</h2>
            <p style="font-size: 14px; line-height: 1.6;">Hi ${fullName || 'there'},</p>
            <p style="font-size: 14px; line-height: 1.6;">We received a request to reset the password for your EcoReport account. Click the button below to set a new password. This link is valid for <strong>30 minutes</strong>.</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="display: inline-block; background: #0B5D2A; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 700;">Reset Password</a>
            </div>
            <p style="font-size: 12px; color: #666; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #0B5D2A; word-break: break-all;">${resetLink}</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
            <p style="font-size: 11px; color: #999; line-height: 1.6;">If you didn't request a password reset, you can safely ignore this email.</p>
            <p style="font-size: 11px; color: #999; line-height: 1.6; margin-top: 16px;">— The EcoReport Team</p>
        </div>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject: 'EcoReport — Password Reset Request',
            html: html,
        });
        if (error) throw new Error(error.message);
        console.log(`✅ Password reset email sent to ${to}`);
    } catch (err) {
        console.error('❌ Failed to send password reset email:', err.message);
    }
}

// ─── NOTIFICATION EMAIL ───
async function sendNotificationEmail(to, title, message, type = 'Notification') {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #333;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0B5D2A; font-size: 26px; margin: 0;">EcoReport</h1>
                <p style="color: #666; font-size: 13px; margin: 4px 0 0 0;">Barangay Sto. Rosario Kanluran</p>
            </div>
            <div style="background: #F0F8ED; border: 1px solid #A9C9A1; border-radius: 12px; padding: 20px 22px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px 0; color: #0B5D2A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;">${type}</p>
                <h2 style="color: #0B5D2A; font-size: 20px; margin: 0 0 12px 0;">${title}</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #333; margin: 0; white-space: pre-line;">${message}</p>
            </div>
            <div style="text-align: center; margin: 28px 0;">
                <a href="${process.env.MOBILE_APP_URL || 'http://localhost:5173'}" style="display: inline-block; background: #0B5D2A; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 10px; font-size: 14px; font-weight: 700;">Open EcoReport App</a>
            </div>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
            <p style="font-size: 11px; color: #999; line-height: 1.6; text-align: center;">You received this because you enabled email notifications in the EcoReport mobile app.</p>
            <p style="font-size: 11px; color: #999; line-height: 1.6; text-align: center; margin-top: 16px;">— The EcoReport Team</p>
        </div>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject: `EcoReport — ${title}`,
            html: html,
        });
        if (error) throw new Error(error.message);
        console.log(`✅ Notification email sent to ${to} (${type})`);
    } catch (err) {
        console.error('❌ Failed to send notification email:', err.message);
    }
}

// ─── VERIFICATION CODE EMAIL ───
async function sendVerificationCodeEmail(to, code, fullName) {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #333;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0B5D2A; font-size: 26px; margin: 0;">EcoReport</h1>
                <p style="color: #666; font-size: 13px; margin: 4px 0 0 0;">Barangay Sto. Rosario Kanluran</p>
            </div>
            <h2 style="color: #0B5D2A; font-size: 20px; margin-top: 0;">Password Reset Code</h2>
            <p style="font-size: 14px; line-height: 1.6;">Hi ${fullName || "there"},</p>
            <p style="font-size: 14px; line-height: 1.6;">Enter this verification code to reset your password. This code is valid for <strong>10 minutes</strong>.</p>
            <div style="text-align: center; margin: 32px 0;">
                <div style="display: inline-block; background: #F0F8ED; border: 2px solid #0B5D2A; border-radius: 12px; padding: 20px 40px; letter-spacing: 12px; font-size: 34px; font-weight: 800; color: #0B5D2A; font-family: 'Courier New', monospace;">${code}</div>
            </div>
            <p style="font-size: 12px; color: #666; line-height: 1.6;">If you didn't request a password reset, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
            <p style="font-size: 11px; color: #999; line-height: 1.6; margin-top: 16px;">— The EcoReport Team</p>
        </div>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject: "EcoReport — Password Reset Code",
            html: html,
        });
        if (error) throw new Error(error.message);
        console.log(`✅ Verification code sent to ${to}`);
    } catch (err) {
        console.error('❌ Failed to send verification code:', err.message);
    }
}

module.exports = { sendPasswordResetEmail, sendNotificationEmail, sendVerificationCodeEmail };