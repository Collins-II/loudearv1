// E-commerce (cart, licensing, paid downloads, Stripe checkout) is temporarily disabled.
// Set NEXT_PUBLIC_ECOMMERCE_ENABLED=true and rebuild to re-enable it.
export const ECOMMERCE_ENABLED = process.env.NEXT_PUBLIC_ECOMMERCE_ENABLED === "true";
