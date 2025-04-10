import nodemailer from 'nodemailer';
import { User, Shift, ShiftType } from '@shared/schema';
import { createPdf } from './scheduler';

// Set up email transporter
let transporter: nodemailer.Transporter;

// Initialize email transport
export function setupEmail() {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525'),
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
}

// Send shift change request notification
export async function sendShiftChangeRequestEmail(
  recipient: User,
  requesterName: string,
  date: Date,
  shiftType: ShiftType
) {
  const formattedDate = date.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const shiftNames: Record<ShiftType, string> = {
    'M': 'Mattina',
    'P': 'Pomeriggio',
    'N': 'Notte',
    'R': 'Riposo',
    'F': 'Ferie',
  };
  
  const mailOptions = {
    from: `"NurseScheduler" <${process.env.MAIL_FROM || 'noreply@nursescheduler.app'}>`,
    to: recipient.email,
    subject: 'Nuova richiesta di cambio turno',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9ecef; border-radius: 5px;">
        <h2 style="color: #1976D2;">Nuova richiesta di cambio turno</h2>
        <p>Gentile ${recipient.name},</p>
        <p>${requesterName} ha richiesto un cambio di turno per:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Data:</strong> ${formattedDate}</p>
          <p><strong>Turno:</strong> ${shiftNames[shiftType]}</p>
        </div>
        <p>Accedi all'applicazione NurseScheduler per approvare o rifiutare la richiesta.</p>
        <a href="${process.env.APP_URL || 'https://nursescheduler.app'}" 
           style="display: inline-block; background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">
          Vai all'applicazione
        </a>
        <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">Questa è un'email automatica. Si prega di non rispondere.</p>
      </div>
    `,
  };
  
  return transporter.sendMail(mailOptions);
}

// Send schedule notification with PDF attachment
export async function sendScheduleEmail(
  recipient: User,
  startDate: Date,
  endDate: Date,
  shifts: Shift[],
  staffName: string
) {
  const startDateFormatted = startDate.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const endDateFormatted = endDate.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  
  // Generate PDF
  const pdfBuffer = await createPdf(shifts, startDate, endDate, staffName, recipient.role);
  
  const mailOptions = {
    from: `"NurseScheduler" <${process.env.MAIL_FROM || 'noreply@nursescheduler.app'}>`,
    to: recipient.email,
    subject: `Nuova pianificazione turni dal ${startDateFormatted} al ${endDateFormatted}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9ecef; border-radius: 5px;">
        <h2 style="color: #1976D2;">Nuova pianificazione turni</h2>
        <p>Gentile ${recipient.name},</p>
        <p>È stata generata una nuova pianificazione dei turni per il periodo:</p>
        <p style="font-weight: bold; text-align: center; margin: 20px 0; font-size: 18px;">
          ${startDateFormatted} - ${endDateFormatted}
        </p>
        <p>In allegato trovi il file PDF con il dettaglio della pianificazione.</p>
        <p>Puoi anche accedere all'applicazione NurseScheduler per visualizzare i turni e richiedere eventuali cambi.</p>
        <a href="${process.env.APP_URL || 'https://nursescheduler.app'}" 
           style="display: inline-block; background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">
          Vai all'applicazione
        </a>
        <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">Questa è un'email automatica. Si prega di non rispondere.</p>
      </div>
    `,
    attachments: [
      {
        filename: `turni_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };
  
  return transporter.sendMail(mailOptions);
}

// Send notification for shift change request status update
export async function sendChangeRequestStatusEmail(
  recipient: User,
  approved: boolean,
  date: Date,
  shiftType: ShiftType
) {
  const formattedDate = date.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const shiftNames: Record<ShiftType, string> = {
    'M': 'Mattina',
    'P': 'Pomeriggio',
    'N': 'Notte',
    'R': 'Riposo',
    'F': 'Ferie',
  };
  
  const status = approved ? 'approvata' : 'rifiutata';
  const statusColor = approved ? '#4CAF50' : '#F44336';
  
  const mailOptions = {
    from: `"NurseScheduler" <${process.env.MAIL_FROM || 'noreply@nursescheduler.app'}>`,
    to: recipient.email,
    subject: `Richiesta di cambio turno ${status}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9ecef; border-radius: 5px;">
        <h2 style="color: ${statusColor};">Richiesta di cambio turno ${status}</h2>
        <p>Gentile ${recipient.name},</p>
        <p>La tua richiesta di cambio turno è stata <strong>${status}</strong>:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Data:</strong> ${formattedDate}</p>
          <p><strong>Turno:</strong> ${shiftNames[shiftType]}</p>
        </div>
        <p>Puoi accedere all'applicazione NurseScheduler per visualizzare i tuoi turni aggiornati.</p>
        <a href="${process.env.APP_URL || 'https://nursescheduler.app'}" 
           style="display: inline-block; background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">
          Vai all'applicazione
        </a>
        <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">Questa è un'email automatica. Si prega di non rispondere.</p>
      </div>
    `,
  };
  
  return transporter.sendMail(mailOptions);
}
