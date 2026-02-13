
import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[EmailService] Initializing with Host:", process.env.SMTP_HOST);
console.log("[EmailService] Initializing with User:", process.env.SMTP_USER);

// Configure Transporter with Brevo SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS 
    }
});

// Helper: Generate PDF Buffer for ID Card
const generateIdCardPdf = async (member) => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        // Icons as inline SVGs (Lucide)
        const icons = {
            phone: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
            droplet: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.74 5.74a8 8 0 1 1-11.48 0l5.74-5.74z"/></svg>`,
            shield: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`
        };

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                
                body { 
                    margin: 0; padding: 0;
                    font-family: 'Inter', sans-serif; 
                    background: #fff;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                }

                .page-container {
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    gap: 40px;
                    align-items: center;
                }

                /* Exact Dimensions from Component: w-[380px] h-[240px] */
                .card-container {
                    width: 380px;
                    height: 240px;
                    background: #fff;
                    border-radius: 16px;
                    overflow: hidden;
                    position: relative;
                    border: 1px solid rgba(0,0,0,0.1);
                    /* box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); */ /* Shadow removed for print clarity */
                    page-break-inside: avoid;
                    display: flex;
                    flex-direction: column;
                }

                /* --- HEADER --- */
                .header {
                    height: 32px;
                    background: #000;
                    position: relative;
                    padding: 0 24px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                
                .header-saffron-block {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 160px;
                    height: 100%;
                    background: #FF6B00;
                    transform: skewX(-30deg) translateX(48px);
                    opacity: 0.9;
                }

                .logo-box {
                    width: 32px;
                    height: 32px;
                    background: #fff;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 14px;
                    color: #000;
                    z-index: 10;
                    flex-shrink: 0;
                }

                .header-text-col {
                    display: flex;
                    flex-direction: column;
                    z-index: 10;
                }
                
                .header-main-text {
                    font-size: 10px;
                    font-weight: 900;
                    color: #fff;
                    text-transform: uppercase;
                    line-height: 1;
                    letter-spacing: -0.02em;
                }

                .header-sub-text {
                    font-size: 13px;
                    font-weight: 900;
                    color: #FF6B00;
                    text-transform: uppercase;
                    line-height: 1;
                    letter-spacing: -0.02em;
                    margin-top: 2px;
                }

                /* --- BODY --- */
                .body-row {
                    flex: 1;
                    display: flex;
                    padding: 8px 16px; /* p-2 gap-4 in component, adjusted slightly for PDF rendering */
                    gap: 16px;
                }

                /* Photo Column */
                .photo-col {
                    width: 96px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    flex-shrink: 0;
                }

                .photo-frame {
                    width: 96px;
                    height: 112px;
                    background: #f3f4f6;
                    border-radius: 12px;
                    border: 2px solid rgba(255, 107, 0, 0.2);
                    overflow: hidden;
                    position: relative;
                }

                .photo-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .no-photo-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 8px;
                    color: #d1d5db; /* gray-300 */
                }

                .status-badge {
                    text-align: center;
                }
                .status-text {
                    font-size: 8px;
                    font-weight: 900;
                    color: #FF6B00;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                /* Details Column */
                .details-col {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    padding-top: 4px;
                }

                .name-text {
                    font-size: 14px;
                    font-weight: 900;
                    color: #000;
                    text-transform: uppercase;
                    line-height: 1.1;
                }

                .designation-text {
                    font-size: 9px;
                    font-weight: 900;
                    color: #FF6B00;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 8px;
                }

                .detail-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 2px; /* Very tight spacing */
                }

                .detail-label {
                    width: 32px; /* Fixed width for labels S/O, DOB */
                    font-size: 8px;
                    font-weight: 900;
                    color: #9ca3af; /* gray-400 */
                    text-transform: uppercase;
                }

                .detail-value {
                    flex: 1;
                    font-size: 9px;
                    font-weight: 700;
                    color: #374151; /* gray-700 */
                    text-transform: uppercase;
                }

                .addr-row {
                    display: flex;
                    align-items: start;
                    gap: 8px;
                    margin-bottom: 2px;
                }
                .addr-label {
                    width: 32px;
                    font-size: 8px;
                    font-weight: 900;
                    color: #9ca3af;
                    text-transform: uppercase;
                    margin-top: 1px;
                }
                .addr-value {
                    flex: 1;
                    font-size: 8px;
                    font-weight: 700;
                    color: #6b7280; /* gray-500 */
                    text-transform: uppercase;
                    line-height: 1.1;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }

                .contact-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 6px;
                    padding-top: 6px;
                    border-top: 1px solid rgba(0,0,0,0.05);
                }

                .contact-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .phone-text {
                    font-size: 9px;
                    font-family: monospace;
                    font-weight: 700;
                    color: #4b5563; /* gray-600 */
                }
                
                .blood-text {
                    font-size: 9px;
                    font-weight: 700;
                    color: #4b5563;
                    text-transform: uppercase;
                }

                /* --- FOOTER --- */
                .footer {
                    height: 48px;
                    background: #f9fafb; /* gray-50 */
                    border-top: 1px solid rgba(0,0,0,0.05);
                    padding: 0 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }

                .footer-box {
                    display: flex;
                    flex-direction: column;
                }
                .footer-box.right {
                    text-align: right;
                }

                .footer-label {
                    font-size: 7px;
                    font-weight: 900;
                    color: #9ca3af; /* gray-400 */
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                }

                .footer-value {
                    font-size: 9px;
                    font-weight: 900;
                    color: #000;
                    text-transform: uppercase;
                    letter-spacing: -0.02em;
                }
                .footer-value.orange {
                    color: #FF6B00;
                }


                /* --- BACK SIDE --- */
                .watermark-container {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.03;
                    pointer-events: none;
                }
                .watermark-text {
                    font-size: 180px;
                    font-weight: 900;
                    color: #000;
                }

                .back-body {
                    flex: 1;
                    display: flex;
                    padding: 16px;
                    gap: 24px;
                    position: relative;
                    z-index: 5;
                }

                .instructions-col {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .instr-header {
                    font-size: 10px;
                    font-weight: 900;
                    color: #000;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 12px;
                    padding-bottom: 4px;
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                    width: fit-content;
                }

                .instr-list {
                    list-style: none;
                    margin: 0; padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .instr-li {
                    display: flex;
                    align-items: start;
                    gap: 6px;
                    font-size: 7px;
                    font-weight: 700;
                    color: #6b7280; /* gray-500 */
                    text-transform: uppercase;
                    line-height: 1.25;
                }
                
                .dot {
                    width: 4px;
                    height: 4px;
                    background: #FF6B00;
                    border-radius: 50%;
                    margin-top: 3px;
                    flex-shrink: 0;
                }

                .qr-col {
                    width: 96px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    gap: 8px;
                }

                .qr-img {
                    width: 64px;
                    height: 64px;
                }

                .qr-text {
                    font-size: 6px;
                    font-weight: 900;
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    line-height: 1.2;
                }

                .back-footer {
                    height: 80px; /* h-20 */
                    background: #f9fafb;
                    border-top: 1px solid rgba(0,0,0,0.05);
                    padding: 0 32px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    position: relative;
                    z-index: 10;
                }

                .signature-section {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .sig-box {
                    height: 40px; /* h-10 */
                    width: 128px; /* w-32 */
                    border-bottom: 1px solid rgba(0,0,0,0.2);
                    position: relative;
                }
                
                .sig-watermark {
                    position: absolute;
                    top: 4px;
                    left: 8px;
                    opacity: 0.1;
                    color: #000;
                }

                .sig-label {
                    font-size: 7px;
                    font-weight: 900;
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .back-footer-right {
                    text-align: right;
                    display: flex;
                    flex-direction: column;
                }
                
                .bf-title {
                    font-size: 9px;
                    font-weight: 900;
                    color: #000;
                    text-transform: uppercase;
                    letter-spacing: -0.02em;
                }
                .bf-sub {
                    font-size: 7px;
                    font-weight: 700;
                    color: #FF6B00;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    line-height: 1;
                    margin-top: 2px;
                }
                .bf-link {
                    font-size: 6px;
                    font-weight: 700;
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-top: 8px;
                    text-decoration: underline;
                }
                
            </style>
        </head>
        <body>
            <div class="page-container">
            
                <!-- FRONT CARD -->
                <div class="card-container">
                    <!-- Header -->
                    <div class="header">
                        <div class="header-saffron-block"></div>
                        <div class="logo-box">ॐ</div>
                        <div class="header-text-col">
                            <span class="header-main-text">Akhil Bharatiya Hindu Mahasabha</span>
                            <span class="header-sub-text">Madhya Pradesh Unit</span>
                        </div>
                    </div>

                    <!-- Body -->
                    <div class="body-row">
                        <!-- Photo -->
                        <div class="photo-col">
                            <div class="photo-frame">
                                ${member.photoUrl ? 
                                    `<img src="${process.env.API_URL || 'http://localhost:5000'}/${member.photoUrl}" class="photo-img" />` : 
                                    `<div class="no-photo-placeholder">
                                        <div style="opacity:0.2; transform: scale(1.5);">
                                            ${icons.shield}
                                        </div>
                                        <div style="font-size:8px; font-weight:bold; margin-top:8px;">NO PHOTO</div>
                                    </div>`
                                }
                            </div>
                            <div class="status-badge">
                                <span class="status-text">Status: Active</span>
                            </div>
                        </div>

                        <!-- Details -->
                        <div class="details-col">
                            <div style="margin-bottom: 8px;">
                                <div class="name-text">${member.firstName} ${member.lastName}</div>
                                <div class="designation-text">Sangathan Sadasya</div>
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">S/O:</span>
                                <span class="detail-value">${member.fatherHusbandName || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">DOB:</span>
                                <span class="detail-value">${member.dob || 'N/A'}</span>
                            </div>
                            <div class="addr-row">
                                <span class="addr-label">Addr:</span>
                                <span class="addr-value">
                                    ${(() => {
                                        if (typeof member.presentAddress === 'object') {
                                            const p = member.presentAddress;
                                            return [p.line1, p.line2, p.city, member.district, p.pincode]
                                                .filter(Boolean)
                                                .join(', ');
                                        }
                                        return (member.presentAddress || '').substring(0, 50);
                                    })()}
                                </span>
                            </div>

                            <div class="contact-row">
                                <div class="contact-item">
                                    ${icons.phone}
                                    <span class="phone-text">${member.mobile}</span>
                                </div>
                                <div class="contact-item">
                                    ${icons.droplet}
                                    <span class="blood-text">B: ${member.bloodGroup || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="footer">
                        <div class="footer-box">
                            <span class="footer-label">Member ID</span>
                            <span class="footer-value">${member.memberId || 'PENDING'}</span>
                        </div>
                        <div class="footer-box right">
                            <span class="footer-label">State Unit</span>
                            <span class="footer-value orange">Madhya Pradesh</span>
                        </div>
                    </div>
                </div>

                <!-- BACK CARD -->
                <div class="card-container">
                    <div class="watermark-container">
                        <div class="watermark-text">ॐ</div>
                    </div>

                    <div class="back-body">
                        <div class="instructions-col">
                            <div class="instr-header">General Instructions</div>
                            <ul class="instr-list">
                                <li class="instr-li"><div class="dot"></div>This card is non-transferable.</li>
                                <li class="instr-li"><div class="dot"></div>Valid only with official signature.</li>
                                <li class="instr-li"><div class="dot"></div>Report loss immediately to state unit.</li>
                                <li class="instr-li"><div class="dot"></div>Verification available at abhm-mp.org.</li>
                            </ul>
                        </div>
                        
                        <div class="qr-col">
                             <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://abhm-mp.org/verify-member?id=${member.memberId}&color=ff6b00" class="qr-img" />
                             <span class="qr-text">Scan to Verify<br>Authenticity</span>
                        </div>
                    </div>

                    <div class="back-footer">
                        <div class="signature-section">
                            <div class="sig-box">
                                <div class="sig-watermark">
                                    <div style="transform:scale(0.8);">
                                        ${icons.shield}
                                    </div>
                                </div>
                            </div>
                            <span class="sig-label">Issuing Authority Signature</span>
                        </div>
                        <div class="back-footer-right">
                            <span class="bf-title">Madhya Pradesh State Unit</span>
                            <span class="bf-sub">Sangathit Hindu - Samarth Bharat</span>
                            <span class="bf-link">www.abhm-mp.org</span>
                        </div>
                    </div>
                </div>

            </div>
        </body>
        </html>
        `;

        await page.setContent(htmlContent);
        
        // Use a standard A4 or flexible size, but fit content
        const pdfBuffer = await page.pdf({ 
            width: '500px', 
            height: '800px',
            printBackground: true 
        });
        
        await browser.close();
        return pdfBuffer;
    } catch (error) {
        console.error("PDF Generation Error:", error);
        return null; 
    }
};

export const sendApprovalEmail = async (member) => {
    console.log(`[EmailService] Starting approval email process for: ${member.email}`);
    try {
        console.log(`[EmailService] Generating PDF for member: ${member.memberId}`);
        const idCardPdf = await generateIdCardPdf(member);
        
        if (idCardPdf) {
            console.log(`[EmailService] PDF generated successfully. Size: ${idCardPdf.length} bytes`);
        } else {
            console.error(`[EmailService] PDF generation failed, sending email without attachment.`);
        }

        const mailOptions = {
            from: `"ABHM MP Admin" <${process.env.SMTP_SENDER_EMAIL || 'admin@abhm-mp.org'}>`,
            to: member.email,
            subject: 'Congratulations! Your ABHM Membership is Approved',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #FF6B00; text-transform: uppercase;">Welcome to ABHM</h2>
                    <p>Dear <strong>${member.firstName}</strong>,</p>
                    <p>We are pleased to inform you that your membership application for <strong>Akhil Bharatiya Hindu Mahasabha (Madhya Pradesh)</strong> has been verified and <strong>APPROVED</strong>.</p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Member ID:</strong> ${member.memberId}</p>
                        <p style="margin: 5px 0 0;"><strong>Status:</strong> Active</p>
                    </div>

                    <p>Your official Digital ID Card is attached to this email. Please download and keep it safe.</p>
                    
                    <p>Jai Hind, Jai Bharat!</p>
                    <p><strong>Admin Team, ABHM-MP</strong></p>
                </div>
            `,
            attachments: idCardPdf ? [{
                filename: `ABHM_ID_Card_${member.memberId}.pdf`,
                content: idCardPdf
            }] : []
        };

        console.log(`[EmailService] Sending email via Transporter...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Approval Email sent successfully to ${member.email}. MessageID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error("[EmailService] CRITICAL ERROR sending approval email:", error);
        // Don't throw logic - allowing flow to continue even if email fails
    }
};

export const sendRejectionEmail = async (member, reason) => {
    try {
        const mailOptions = {
            from: `"ABHM MP Admin" <${process.env.SMTP_SENDER_EMAIL || 'admin@abhm-mp.org'}>`,
            to: member.email,
            subject: 'Update on your ABHM Membership Application',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #d1d5db; text-transform: uppercase;">Application Status Update</h2>
                    <p>Dear <strong>${member.firstName}</strong>,</p>
                    <p>Thank you for your interest in joining <strong>Akhil Bharatiya Hindu Mahasabha</strong>.</p>
                    <p>After reviewing your application, we regret to inform you that it has been <strong>REJECTED</strong> at this time.</p>
                    
                    <div style="background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #fecaca;">
                        <p style="margin: 0;"><strong>Reason for Rejection:</strong></p>
                        <p style="margin: 5px 0 0; font-weight: bold;">${reason || 'Document verification failed or incomplete details.'}</p>
                    </div>

                    <p>You may rectify the issues and re-apply via the portal.</p>
                    
                    <p>Regards,</p>
                    <p><strong>Verification Team, ABHM-MP</strong></p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Rejection Email sent to ${member.email}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error("Error sending rejection email:", error);
    }
};

export default { sendApprovalEmail, sendRejectionEmail };
