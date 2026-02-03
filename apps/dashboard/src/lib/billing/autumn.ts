import { Autumn } from "autumn-js";

const AUTUMN_SECRET_KEY = process.env.AUTUMN_SECRET_KEY;

export const autumn = AUTUMN_SECRET_KEY ? new Autumn(AUTUMN_SECRET_KEY) : null;
