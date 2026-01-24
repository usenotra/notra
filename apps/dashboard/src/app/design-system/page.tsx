import { notFound } from "next/navigation";
import DesignSystemClientPage from "@/app/design-system/page-client";

export default async function DesignSystemPage() {
	if (process.env.NODE_ENV === "production") {
		notFound();
	}

	return <DesignSystemClientPage />;
}
