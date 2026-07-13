export function eventOffer(price) {
  if (typeof price !== 'number' || !Number.isFinite(price)) return undefined;
  return { '@type': 'Offer', price, priceCurrency: 'PLN' };
}
