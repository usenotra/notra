import {
	EMAIL_CONFIG,
	InviteUserEmail,
	ResetPasswordEmail,
	VerifyUserEmail,
	WelcomeEmail,
} from "@notra/email";
import type { Resend } from "resend";

interface SendInviteEmailProps {
	inviteeEmail: string;
	inviteeUsername?: string;
	inviterName: string;
	inviterEmail: string;
	organizationName: string;
	inviteLink: string;
}

export async function sendInviteEmail(
	resend: Resend,
	{
		inviteeEmail,
		inviterName,
		inviterEmail,
		organizationName,
		inviteLink,
	}: SendInviteEmailProps,
) {
	return await resend.emails.send({
		from: EMAIL_CONFIG.from,
		replyTo: EMAIL_CONFIG.replyTo,
		to: inviteeEmail,
		subject: `Join ${organizationName} on Notra`,
		react: InviteUserEmail({
			inviteeEmail,
			invitedByUsername: inviterName,
			invitedByEmail: inviterEmail,
			organizationName,
			inviteLink,
		}),
	});
}

function getVerificationSubject(type: "sign-in" | "email-verification") {
	switch (type) {
		case "sign-in":
			return "Your sign-in code";
		case "email-verification":
			return "Verify your email address";
	}
}

export async function sendVerificationEmail(
	resend: Resend,
	{
		userEmail,
		otp,
		type,
	}: {
		userEmail: string;
		otp: string;
		type: "sign-in" | "email-verification";
	},
) {
	return await resend.emails.send({
		from: EMAIL_CONFIG.from,
		replyTo: EMAIL_CONFIG.replyTo,
		to: userEmail,
		subject: getVerificationSubject(type),
		react: VerifyUserEmail({
			userEmail,
			otp,
			type,
		}),
	});
}

export async function sendResetPassword(
	resend: Resend,
	{
		userEmail,
		resetLink,
	}: {
		userEmail: string;
		resetLink: string;
	},
) {
	return await resend.emails.send({
		from: EMAIL_CONFIG.from,
		replyTo: EMAIL_CONFIG.replyTo,
		to: userEmail,
		subject: "Reset your password",
		react: ResetPasswordEmail({
			userEmail,
			resetLink,
		}),
	});
}

export async function sendWelcomeEmail(
	resend: Resend,
	{
		userEmail,
	}: {
		userEmail: string;
	},
) {
	return await resend.emails.send({
		from: EMAIL_CONFIG.from,
		replyTo: EMAIL_CONFIG.replyTo,
		to: userEmail,
		subject: "Welcome to Notra!",
		react: WelcomeEmail({
			userEmail,
			baseUrl: EMAIL_CONFIG.getAppUrl(),
		}),
	});
}
