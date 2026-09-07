// Combines a REST-fetched quote (price, change, changePercent) with a live websocket tick
// ({price, timestamp} from useLiveQuote), falling back to the REST values until a tick arrives.
// previousClose isn't a field on EnrichedQuote, but it's exactly recoverable: the REST quote's
// price/change both come from Finnhub's (c, d) pair, so price - change === pc.
export function deriveLive(quote, live) {
  const previousClose = quote.price - quote.change;
  const price = live?.price ?? quote.price;
  const change = live ? live.price - previousClose : quote.change;
  const changePercent = live ? (change / previousClose) * 100 : quote.changePercent;
  return { price, change, changePercent };
}
