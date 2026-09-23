import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log(
      "M-PESA CALLBACK:",
      JSON.stringify(body, null, 2)
    );

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Callback received successfully",
    });
  } catch (error) {
    console.error("Callback error:", error);

    return NextResponse.json(
      {
        ResultCode: 1,
        ResultDesc: "Callback processing failed",
      },
      { status: 400 }
    );
  }
}