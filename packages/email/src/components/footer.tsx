import { Hr, Link, Section, Text } from "@react-email/components";
import { EMAIL_CONFIG } from "../utils/config";

export const EmailFooter = () => {
	const currentYear = new Date().getFullYear();

	return (
		<Section>
			<Hr className="mx-0 mb-[26px] w-full border border-[#eaeaea] border-solid" />
			<Text className="m-0 text-center text-xs" style={{ color: "#717175" }}>
				© {currentYear} Notra. All rights reserved.
			</Text>
			<Text className="mt-4 text-center text-xs" style={{ color: "#717175" }}>
				<Link
					href="https://usenotra.com"
					style={{ color: "#717175", textDecoration: "underline" }}
				>
					Website
				</Link>
				{" · "}
				<Link
					href="https://usenotra.com/legal"
					style={{ color: "#717175", textDecoration: "underline" }}
				>
					Legal Notice
				</Link>
				{" · "}
				<Link
					href="https://usenotra.com/privacy"
					style={{ color: "#717175", textDecoration: "underline" }}
				>
					Privacy Policy
				</Link>
				{" · "}
				<Link
					href={`mailto:${EMAIL_CONFIG.replyTo}`}
					style={{ color: "#717175", textDecoration: "underline" }}
				>
					Support
				</Link>
			</Text>
		</Section>
	);
};
