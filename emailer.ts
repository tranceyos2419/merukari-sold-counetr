import nodemailer from "nodemailer";
import path from "path";
import { successEmailTemplate, errorEmailTemplate } from "./email-template"; // Adjust path as necessary

interface EmailOptions {
	recipient: string;
	subject: string;
	attachmentPath?: string; // Optional: Include for success emails
	isError: boolean; // Specify if this is an error email
}

// The retry mechanism for sending email
export const sendEmailWithRetry = async (
	options: EmailOptions,
	retries: number = 3
): Promise<void> => {
	const { recipient, subject, attachmentPath, isError } = options;

	const transporter = nodemailer.createTransport({
		//  SMTP host
		host: process.env.SMTP_HOST,
		port: parseInt(process.env.SMTP_PORT || "587", 10),
		auth: {
			user: process.env.MAILTRAP_USER,
			pass: process.env.MAILTRAP_PASS,
		},
	});

	const htmlContent = isError ? errorEmailTemplate() : successEmailTemplate();

	const mailOptions: any = {
		from: `"Scraping App" <${process.env.SENDER_EMAIL}>`,
		to: recipient,
		subject: subject,
		html: htmlContent,
	};

	if (!isError && attachmentPath) {
		mailOptions.attachments = [
			{
				filename: path.basename(attachmentPath),
				path: attachmentPath,
			},
		];
	}



	//  Retry sending email up to 3 times for network issues or other problems
	let attempts = 0;
	while (attempts < retries) {
		try {
			await transporter.sendMail(mailOptions);
			console.log(`Email sent to ${recipient}`);
			return; // Exit if email is sent successfully
		} catch (error) {
			attempts++;
			console.error(`Attempt ${attempts} failed: ${error.message}`);

			if (attempts < retries) {
				console.log(`Retrying in 1 minute...`);
				// handling internet issue and other issues
				await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 1 minute
			} else {
				console.error("Failed to send email after 3 attempts.");
				throw new Error("Email send failed after multiple attempts.");
			}
		}
	}
};
