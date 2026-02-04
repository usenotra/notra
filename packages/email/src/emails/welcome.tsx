import {
	Body,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { EmailButton } from "../components/button";
import { EmailFooter } from "../components/footer";
import { EMAIL_CONFIG } from "../utils/config";

interface WelcomeEmailProps {
	userEmail: string;
	baseUrl: string;
}

export const WelcomeEmail = ({ userEmail, baseUrl }: WelcomeEmailProps) => {
	const previewText = `Welcome to Notra!`;
	const logoUrl = EMAIL_CONFIG.getLogoUrl();

	return (
		<Html>
			<Head />
			<Preview>{previewText}</Preview>
			<Tailwind>
				<Body className="mx-auto my-auto bg-white px-2 font-sans">
					<Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
						<Section className="mt-[32px]">
							<Img
								alt="Notra Logo"
								className="mx-auto"
								height="40"
								src={logoUrl}
								width="40"
							/>
						</Section>
						<Heading className="my-6 text-center font-medium text-2xl text-black">
							Welcome to Notra
						</Heading>
						<Text className="text-center text-[#737373] text-base leading-relaxed">
							Thanks for signing up, <strong>{userEmail}</strong>! We're excited
							to have you on board.
						</Text>
						<Section className="my-8 text-center">
							<EmailButton href={baseUrl}>Go to Dashboard</EmailButton>
						</Section>
						<EmailFooter />
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default WelcomeEmail;
