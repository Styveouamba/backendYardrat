import axios, { AxiosError } from 'axios';

interface NabooPaymentRequest {
  method_of_payment: string[];
  products: {
    name: string;
    price: number;
    quantity: number;
    description?: string;
  }[];
  success_url: string;
  error_url: string;
  fees_customer_side: boolean;
  is_escrow: boolean;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  };
  metadata?: Record<string, any>;
}

interface NabooPaymentResponse {
  order_id: string;
  amount: number;
  method_of_payment: string[];
  currency: string;
  created_at: string;
  transaction_status: string;
  checkout_url: string;
  customer?: any;
  is_escrow: boolean;
  is_merchant: boolean;
}

const NABOO_API_KEY = process.env.NABOO_API_KEY || '';
const NABOO_API_URL = process.env.NABOO_API_URL || 'https://api.naboopay.com';
const API_URL_RAW = process.env.API_URL?.trim();
const BACKEND_URL = API_URL_RAW?.replace(/\/$/, '') || 'http://localhost:5000';

console.log('[NabooPay] Backend URL config', {
  API_URL_RAW,
  BACKEND_URL,
  NABOO_API_URL,
});
export const initializePayment = async (
  amount: number,
  paymentMethod: string,
  direction: 'waveToOrange' | 'orangeToWave',
  destination: string,
  userId: string,
): Promise<NabooPaymentResponse> => {
  try {
    const payload: NabooPaymentRequest = {
      method_of_payment: [paymentMethod],
      products: [
        {
          name: `Transfert ${direction === 'waveToOrange' ? 'Wave → Orange' : 'Orange → Wave'}`,
          price: amount,
          quantity: 1,
          description: `Transfert ${direction === 'waveToOrange' ? 'Wave vers Orange' : 'Orange vers Wave'}`,
        },
      ],
      success_url: `${BACKEND_URL}/api/payment/success?direction=${direction}&destination=${encodeURIComponent(destination)}`,
      error_url: `${BACKEND_URL}/api/payment/error?direction=${direction}&destination=${encodeURIComponent(destination)}`,
      fees_customer_side: false,
      is_escrow: false,
      customer: {
        first_name: 'Client',
        last_name: destination,
        phone: destination,
        email: `${userId}@example.com`,
      },
      metadata: {
        userId,
        direction,
        destination,
      },
    };

    console.log('[NabooPay] Sending payment request', {
      userId,
      amount,
      paymentMethod,
      direction,
      destination,
      callbackSuccess: payload.success_url,
      callbackError: payload.error_url,
    });

    const response = await axios.post(
      `${NABOO_API_URL}/api/v2/transactions`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${NABOO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const result = {
      order_id: response.data.order_id,
      amount: response.data.amount,
      method_of_payment: response.data.method_of_payment,
      currency: response.data.currency,
      created_at: response.data.created_at,
      transaction_status: response.data.transaction_status,
      checkout_url: response.data.checkout_url,
      customer: response.data.customer,
      is_escrow: response.data.is_escrow,
      is_merchant: response.data.is_merchant,
    };

    console.log('[NabooPay] Payment request succeeded', {
      userId,
      orderId: result.order_id,
      transactionStatus: result.transaction_status,
      checkoutUrl: result.checkout_url,
    });

    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error('[NabooPay] Payment initialization failed:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message,
      });
      throw new Error(
        `NabooPay API error: ${JSON.stringify(axiosError.response?.data) || axiosError.message}`
      );
    }

    console.error('[NabooPay] Unexpected error:', error);
    throw new Error('Failed to initialize payment with NabooPay');
  }
};
