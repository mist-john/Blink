import { NextResponse } from "next/server";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

const PUMP_API_BASE_URL =
  process.env.NEXT_PUBLIC_PUMP_FUN_API_URL || "https://pump.fun";

export async function POST(request: Request) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    
    // Make the request to Pump.fun API
    const response = await fetch(
      `${PUMP_API_BASE_URL}/api/ipfs`,
      {
        method: "POST",
        body: formData,
        headers: {
          Origin: "https://pump.fun",
          Referer: "https://pump.fun/",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Pump API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Return the data
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying request to Pump IPFS API:", error);
    return NextResponse.json(
      { error: "Failed to upload to IPFS via Pump API" },
      { status: 500 },
    );
  }
} 