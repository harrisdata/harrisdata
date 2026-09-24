"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function CheckoutContent() {
  const searchParams = useSearchParams();

  const packageName = searchParams.get("package") || "1GB";
  const price = searchParams.get("price") || "19";
  const validity = searchParams.get("validity") || "1 Hour";

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handlePayNow() {
    setMessage("");

    if (!phone.trim()) {
      setMessage("Please enter your M-PESA phone number.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          amount: Number(price),
          package: packageName,
          validity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Payment request failed.");
        return;
      }

      setMessage(
        data.message || "M-PESA payment request sent successfully."
      );
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the payment server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-gray-900">
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Harris Data Deals
        </h1>

        <p className="mb-6 text-gray-600">
          Fast • Reliable • Affordable
        </p>

        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Checkout
        </h2>

        <div className="mb-6 rounded-lg bg-gray-100 p-4 text-gray-900">
          <p className="mb-2">
            <strong>Package:</strong> {packageName}
          </p>

          <p className="mb-2">
            <strong>Validity:</strong> {validity}
          </p>

          <p className="text-lg font-bold">
            <strong>Price:</strong> KSh {price}
          </p>
        </div>

        <label className="mb-2 block font-medium text-gray-900">
          M-PESA Phone Number
        </label>

        <input
          type="tel"
          placeholder="07XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400 outline-none focus:border-green-600"
        />

        <button
          onClick={handlePayNow}
          disabled={loading}
          className="w-full rounded-lg bg-green-600 p-3 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending M-PESA Request..." : "PAY NOW"}
        </button>

        {message && (
          <div className="mt-4 rounded-lg bg-gray-100 p-3 text-center text-gray-900">
            {message}
          </div>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          You will receive an M-PESA payment prompt on your phone.
        </p>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}