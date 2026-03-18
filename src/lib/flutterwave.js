import { uniqueRef } from './utils'

export const FLW_PUBLIC_KEY = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY

export function buildPaymentConfig({ user, amountFiat, currency, tcAmount, onSuccess, onClose }) {
  return {
    public_key: FLW_PUBLIC_KEY,
    tx_ref: uniqueRef(),
    amount: amountFiat,
    currency,
    payment_options: 'card,banktransfer,ussd',
    customer: {
      email: user.email,
      name: user.username,
    },
    customizations: {
      title: 'Tourena Coins',
      description: `Purchase ${tcAmount} TC`,
      logo: `${window.location.origin}/coin.svg`,
    },
    callback: onSuccess,
    onclose: onClose,
  }
}
