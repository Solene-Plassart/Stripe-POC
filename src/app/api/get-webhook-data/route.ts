import { NextRequest, NextResponse } from "next/server";
import { webhookData } from "@/lib/mock-db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email } = body;
  console.log("email à chercher dans le mock : ", email);

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "customerId manquant ou invalide" },
      { status: 400 }
    );
  }

  const data = webhookData[email];

  if (!data) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, data });
}
