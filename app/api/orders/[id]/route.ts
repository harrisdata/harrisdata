import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const orders = await sql`
      SELECT
        id,
        phone,
        package_name,
        validity,
        amount,
        status,
        mpesa_receipt,
        result_code,
        result_desc,
        created_at,
        updated_at
      FROM orders
      WHERE id = ${id}
      LIMIT 1
    `;

    if (orders.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: orders[0],
    });
  } catch (error) {
    console.error("ORDER STATUS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve order status.",
      },
      { status: 500 }
    );
  }
}